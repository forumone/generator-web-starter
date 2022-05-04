import ComposeEditor, { createBindMount } from './ComposeEditor';
import spawnComposer from './spawnComposer';
import { color } from '../../../../log';
import { WSGenerator } from '../../../../wsGenerator';
import {
  createComposerProject,
  renameWebRoot,
  standardizeComposerJson,
} from './composerInstallUtils';

export enum CmsType {
  Drupal = 'drupal',
  WordPress = 'wordpress',
}

export enum ProjectType {
  Drupal8 = 'drupal8',
  Drupal9 = 'drupal9',
  WordPress = 'wordpress',
}

export enum HostingType {
  F1 = 'forumone',
  Pantheon = 'pantheon',
  Other = 'other',
  Unknown = 'unknown',
}

export const projectUpstreams: Record<ProjectType, string> = {
  [ProjectType.Drupal8]: 'forumone/drupal-project:8.x-dev',
  [ProjectType.Drupal9]: 'forumone/drupal-project:9.x-dev',
  [ProjectType.WordPress]: 'forumone/wordpress-project',
};

export abstract class PhpCmsGenerator extends WSGenerator {
  abstract cmsType: CmsType;
  abstract servicePath: string; // `services/${this.cmsType}`;
  abstract documentRoot: string;

  // Assigned to in prompting phase
  abstract projectType: ProjectType;
  abstract projectUpstream: string;
  protected shouldInstall!: boolean;
  protected useGesso!: boolean;
  protected useCapistrano!: boolean;
  protected hostingService: HostingType = HostingType.Unknown;

  // Configured within the configuring phase based on prompt selections
  protected additionalComposerDependencies: string[] = [];

  protected spawnComposer: typeof spawnComposer = spawnComposer.bind(this);

  // Bind helper functions.
  public _createComposerProject = createComposerProject.bind(this);
  public _renameWebRoot = renameWebRoot.bind(this);
  public _standardizeComposerJson = standardizeComposerJson.bind(this);

  protected abstract _prepareDockerComposeServices(): void;

  protected _prepareCodacyComposeServices(): void {
    const cliEditor = this.options.composeCliEditor as ComposeEditor;

    const codacyService = {
      image: 'codacy/codacy-analysis-cli:latest',
      environment: {
        CODACY_CODE: '$PWD',
      },
      command: 'analyze',
      volumes: [
        createBindMount('$PWD', '$PWD'),
        createBindMount('/var/run/docker.sock', '/var/run/docker.sock'),
        createBindMount('/tmp', '/tmp'),
      ],
    };

    // Create additional services to run Codacy locally.
    cliEditor.addService('codacy', codacyService);
    cliEditor.addService('phpcs', {
      ...codacyService,
      entrypoint: '/opt/codacy/bin/codacy-analysis-cli analyze -t phpcs',
      command: '',
    });
    cliEditor.addService('phpmd', {
      ...codacyService,
      entrypoint: '/opt/codacy/bin/codacy-analysis-cli analyze -t phpmd',
      command: '',
    });
    cliEditor.addService('eslint', {
      ...codacyService,
      entrypoint: '/opt/codacy/bin/codacy-analysis-cli analyze -t eslint',
      command: '',
    });
    cliEditor.addService('stylelint', {
      ...codacyService,
      entrypoint: '/opt/codacy/bin/codacy-analysis-cli analyze -t stylelint',
      command: '',
    });
  }

  /**
   * Complete scaffolding and customization steps for the project service directory.
   */
  protected async _scaffoldProject(): Promise<void> {
    if (!this.shouldInstall) {
      return;
    }

    await this._preScaffold();
    await this._doScaffold();
    await this._postScaffold();
  }

  /* eslint-disable no-empty-function, @typescript-eslint/no-empty-function */
  protected async _preScaffold(): Promise<void> {}
  protected async _doScaffold(): Promise<void> {}
  /* eslint-enable no-empty-function, @typescript-eslint/no-empty-function */

  protected async _postScaffold(): Promise<void> {
    if (this.additionalComposerDependencies) {
      // Install required dependencies to avoid Gesso crashing when enabled
      this.info(
        'Installing remaining Composer dependencies: %s',
        this.additionalComposerDependencies.join(', '),
      );
      await this._installAdditionalComposerDependencies();
    }
  }

  protected async _installAdditionalComposerDependencies(): Promise<void> {
    await this.spawnComposer(
      [
        'require',
        ...this.additionalComposerDependencies,
        '--ignore-platform-reqs',
        '--no-scripts',
        '--no-install',
      ],
      {
        cwd: this.destinationPath(this.servicePath),
      },
    ).catch(() => {
      this.env.error(
        new Error(
          color.error(
            'Installation of additional Composer dependencies failed.',
          ),
        ),
      );
    });
  }

  /**
   * Test if the web root will need to be renamed to match requests.
   *
   * The project templates assume the web root should be named `web`, so
   * if the request is to name it otherwise some manual adjustment will be
   * needed.
   */
  protected _needsDocRootRename(): boolean {
    const needsRename = this.documentRoot !== 'web';

    // Crash early if the user asked for a non-'web' root for a Pantheon project.
    // This will help prevent a lot of headaches due to misalignment with the platform's
    // requirements.
    if (this.hostingService === HostingType.Pantheon && needsRename) {
      throw new Error(
        `Pantheon projects do not support '${this.documentRoot}' as the document root.`,
      );
    }

    return needsRename;
  }

  // We have to run the drupal installation here because drupal-scaffold will fail if the target
  // directory (services/drupal) exists and is not empty.
  // This means that we can't run when the Dockerfile is written out by the generator during the
  // writing phase, despite the `installing' phase being the more natural choice.
  public async scaffolding(): Promise<void> {
    await this._scaffoldProject();
  }

  public async install(): Promise<void> {
    if (this.options.skipInstall) {
      this.info(
        'Skipping final Composer installation due to `--skip-install` option.',
      );
      return;
    }

    // Run final installation of all Composer dependencies now that all
    // requirements have been assembled.
    this.info('Running final Composer installation.');
    await this.spawnComposer(['install', '--ignore-platform-reqs'], {
      cwd: this.destinationPath(this.servicePath),
    }).catch(() => {
      this.env.error(
        new Error(
          color.error('Final installation of Composer dependencies failed.'),
        ),
      );
    });
  }

  /**
   * Write code quality configuration files for the project.
   */
  protected _writeCodeQualityConfig(): void {
    this.debug('Rendering .codacy.yml template to %s.', '.codacy.yml');
    this.renderTemplate(
      this.templatePath('_codacy.yml.ejs'),
      this.destinationPath('.codacy.yml'),
      {
        documentRoot: this.documentRoot,
        useGesso: this.useGesso,
        isPantheon: this.hostingService === HostingType.Pantheon,
      },
    );

    // Use the provided files from the repository if installing from the repository.
    // This will avoid conflicts in the templates and the repository while also
    // allowing the files to be created on existing projects not installing from the
    // repository templates.
    if (!this.shouldInstall) {
      this.debug(
        'Rendering phpcs.xml.dist template to %s.',
        `${this.servicePath}/phpcs.xml.dist`,
      );
      this.renderTemplate(
        this.templatePath('phpcs.xml.dist.ejs'),
        this.destinationPath(`${this.servicePath}/phpcs.xml.dist`),
        {
          documentRoot: this.documentRoot,
        },
      );

      this.debug(
        'Rendering .phpmd.xml.dist template to %s.',
        `${this.servicePath}/.phpmd.xml.dist`,
      );
      this.renderTemplate(
        this.templatePath('_phpmd.xml.dist.ejs'),
        this.destinationPath(`${this.servicePath}/.phpmd.xml.dist`),
        {
          documentRoot: this.documentRoot,
        },
      );
    }
  }
}
