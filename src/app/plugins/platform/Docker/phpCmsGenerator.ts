import { posix } from 'path';
import ComposeEditor, { createBindMount } from './ComposeEditor';
import spawnComposer from './spawnComposer';
import {
  enableXdebug,
  enableXdebugProfiler,
  xdebugEnvironment,
} from './xdebug';
import { color } from '../../../../log';
import { WSGenerator } from '../../../../wsGenerator';

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
  [ProjectType.WordPress]: '',
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

  protected _prepareDockerComposeServices(): void {
    this.fs.copyTpl(
      this.templatePath('nginx.conf.ejs'),
      this.destinationPath('services/nginx/default.conf'),
      { documentRoot: this.documentRoot },
    );

    // Both Drupal and nginx containers use /var/www/html as the root of the app,
    // so these paths can be shared between both service definitions in this file.
    const varHtmlPath = posix.join('/var/www/html/', this.documentRoot);

    // Path to Drupal uploads (when not using s3fs)
    const uploadPath = posix.join(varHtmlPath, 'sites/default/files');

    const editor = this.options.composeEditor as ComposeEditor;

    // Volumes needed by Drupal, shared with nginx.
    // * fs-data: sites/default/files
    //   Needed so that we can persist saved files across containers.
    const filesystemVolumeName = editor.ensureVolume('fs-data');

    const hostDrupalPath = `./${posix.join(
      this.servicePath,
      this.documentRoot,
    )}`;

    editor.addNginxService({
      depends_on: ['drupal'],
      volumes: [
        createBindMount(
          './services/nginx/default.conf',
          '/etc/nginx/conf.d/default.conf',
          { readOnly: true },
        ),
        createBindMount(hostDrupalPath, varHtmlPath),
        {
          type: 'volume',
          source: filesystemVolumeName,
          target: uploadPath,
          read_only: true,
        },
      ],
    });

    // Use an array here because, for some odd reason, dedent gets confused about how
    // string indentation works otherwise.
    const drupalEntryCommand = [
      `chmod -R 0777 ${uploadPath}`,
      enableXdebug,
      enableXdebugProfiler,
      'exec php-fpm',
    ].join('\n');

    editor.addService(this.cmsType, {
      build: { context: `./${this.servicePath}`, target: 'dev' },
      command: ['sh', '-c', drupalEntryCommand],
      depends_on: ['mysql'],
      environment: {
        SMTPHOST: 'mailhog:1025',
        ...xdebugEnvironment,
      },
      volumes: [
        createBindMount(`./${this.servicePath}`, '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolumeName,
          target: uploadPath,
        },
      ],
    });

    editor.addMysqlService();
    editor.addMailhogService();

    const cliEditor = this.options.composeCliEditor as ComposeEditor;

    // Build custom container for drush 9
    cliEditor.addService('drush', {
      build: './services/drush',
      // Pass --root to the entrypoint so that Drush can both see the full Drupal
      // install and know where the site's root actually is.
      entrypoint: ['/var/www/html/vendor/bin/drush'],
      working_dir: varHtmlPath,
      volumes: [
        createBindMount(`./${this.servicePath}`, '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolumeName,
          target: uploadPath,
        },
      ],
    });

    cliEditor.addComposer(this.servicePath);

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
