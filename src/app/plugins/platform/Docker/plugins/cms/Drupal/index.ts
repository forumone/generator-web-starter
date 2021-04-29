import { posix } from 'path';
import validFilename from 'valid-filename';
import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import getLatestDrupal8Tag from '../../../registry/getLatestDrupal8Tag';
import getLatestDrupal8CliTag from '../../../registry/getLatestDrupal8CliTag';
import {
  enableXdebug,
  enableXdebugProfiler,
  xdebugEnvironment,
} from '../../../xdebug';
import createDrupalDockerfile from './createDrupalDockerfile';
import createDrushDockerfile from './createDrushDockerfile';
import { gessoDrupalPath } from '../../gesso/constants';
import {
  createDrupalProject,
  renameWebRoot,
  standardizeComposerJson,
} from './installUtils';
import { color } from '../../../../../../../log';
import {
  CmsType,
  HostingType,
  PhpCmsGenerator,
  ProjectType,
  projectUpstreams,
} from '../../../phpCmsGenerator';

/**
 * Drupal CMS project generator.
 */
export default class Drupal extends PhpCmsGenerator {
  cmsType = CmsType.Drupal;
  servicePath = `services/${this.cmsType}`;

  // Assigned to in initializing phase
  latestDrupalTag!: string;
  latestDrushTag!: string;

  // Assigned to in prompting phase
  documentRoot = 'web';
  projectType!: ProjectType.Drupal8 | ProjectType.Drupal9;
  projectUpstream!: string;

  // Bind helper functions.
  public _createDrupalProject = createDrupalProject.bind(this);
  public _renameWebRoot = renameWebRoot.bind(this);
  public _standardizeComposerJson = standardizeComposerJson.bind(this);

  public async initializing(): Promise<void> {
    const [latestDrupalTag, latestDrushTag] = await Promise.all([
      getLatestDrupal8Tag(),
      getLatestDrupal8CliTag(),
    ]);
    this.debug(
      'Loaded latest Drupal (%s) and Drush (%s) tags.',
      latestDrupalTag,
      latestDrushTag,
    );

    this.latestDrupalTag = latestDrupalTag;
    this.latestDrushTag = latestDrushTag;
  }

  public async prompting(): Promise<void> {
    const {
      documentRoot,
      useCapistrano,
      useGesso,
      shouldInstallDrupal,
      drupalProjectType,
      hostingService,
    } = await this.promptOrUninteractive([
      {
        type: 'input',
        name: 'documentRoot',
        validate: name => name !== '' && validFilename(name),
        message: 'What is the document root?',
        default: 'web',
        store: true,
      },
      {
        type: 'confirm',
        name: 'useGesso',
        message: 'Use Gesso?',
        default: true,
        store: true,
      },
      {
        type: 'confirm',
        name: 'useCapistrano',
        message: 'Deploy with Capistrano?',
        default: true,
        store: true,
      },
      {
        type: 'confirm',
        name: 'shouldInstallDrupal',
        message: 'Install Drupal?',
        store: true,
        default: (answers: { documentRoot: string }) => {
          const targetPath = this.destinationPath(
            this.servicePath,
            answers.documentRoot,
          );

          return !this.fs.exists(targetPath);
        },
      },
      {
        type: 'list',
        name: 'drupalProjectType',
        message: 'Select project type to install:',
        store: true,
        // NB. `as' casts below needed to dodge a deficiency in the Inquirer types
        // (they don't know about the 'choice' property)
        choices: [
          {
            name: `Drupal 8 Project (${projectUpstreams[ProjectType.Drupal8]})`,
            value: ProjectType.Drupal8,
            short: 'Drupal 8 Project',
          } as { name: string; value: string },
          {
            name: `Drupal 9 Project (${projectUpstreams[ProjectType.Drupal9]})`,
            value: ProjectType.Drupal9,
            short: 'Drupal 9 Project',
          } as { name: string; value: string },
        ],
        when: answers => answers.shouldInstallDrupal,
      },
      {
        type: 'list',
        name: 'hostingService',
        message: 'Select the hosting service to prepare for if known:',
        store: true,
        // NB. `as' casts below needed to dodge a deficiency in the Inquirer types
        // (they don't know about the 'choice' property)
        choices: [
          {
            name: `Forum One Hosting`,
            value: HostingType.F1,
          } as { name: string; value: string },
          {
            name: `Pantheon Hosting`,
            value: HostingType.Pantheon,
          } as { name: string; value: string },
          {
            name: `Other Hosting`,
            value: HostingType.Other,
          } as { name: string; value: string },
          {
            name: `Unknown`,
            value: HostingType.Unknown,
          } as { name: string; value: string },
        ],
      },
    ]);

    this.documentRoot = documentRoot;
    this.shouldInstall = shouldInstallDrupal;
    this.projectType = drupalProjectType;
    this.projectUpstream = projectUpstreams[this.projectType];
    this.hostingService = hostingService;
    this.useGesso = useGesso;
    this.useCapistrano = useCapistrano;
  }

  protected _useCapistrano() {
    const capistranoOptions = {
      platform: 'drupal8',
      name: this.options.name,
      webroot: this.documentRoot,
      appWebroot: posix.join(this.servicePath, this.documentRoot),
      config: {
        drupal_features: false,
      },
      linkedDirectories: [
        posix.join(this.servicePath, this.documentRoot, 'sites/default/files'),
      ],
      linkedFiles: [`${this.servicePath}/.env`],
      uninteractive: this.options.uninteractive,
    };
    this.info('Composing with the Capistrano generator.', capistranoOptions);
    this.composeWith(this.options.capistrano, capistranoOptions);
  }

  protected _useGesso() {
    const gessoOptions = {
      documentRoot: this.documentRoot,
      composeEditor: this.options.composeEditor,
      composeCliEditor: this.options.composeCliEditor,
      uninteractive: this.options.uninteractive,
    };
    this.debug('Composing with the Gesso generator.', gessoOptions);
    this.composeWith(require.resolve('../../gesso/GessoDrupal8'), gessoOptions);
  }

  public configuring(): void {
    if (this.useCapistrano) {
      this._useCapistrano();
    }

    if (this.useGesso) {
      this._useGesso();
    }

    this._prepareDockerComposeServices();
    this._prepareCodacyComposeServices();

    if (this.useGesso) {
      this.additionalComposerDependencies.push(
        'drupal/components',
        'drupal/twig_field_value',
      );

      // Pin the twig_tweak version for Drupal 8.
      if (this.projectType === ProjectType.Drupal8) {
        this.additionalComposerDependencies.push('drupal/twig_tweak:^2.9');
      } else {
        this.additionalComposerDependencies.push('drupal/twig_tweak');
      }
    }
  }

  protected _prepareDockerComposeServices() {
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

  /**
   * Complete scaffolding and customization steps for the Drupal service directory.
   */
  protected async _doScaffold(): Promise<void> {
    this.info('Creating Drupal project.');
    await this._createDrupalProject();

    const drupalRoot = this.destinationPath(this.servicePath);

    // The project scaffolding tools assume the web root should be named `web`,
    // so various references need to be replaced with the designated rename if
    // this is not the name selected for the project.
    if (this._needsDocRootRename()) {
      this.debug('Replacing docroot references in generated files.');
      await this._renameWebRoot(this.documentRoot, drupalRoot);
    }
  }

  /**
   * Test if the web root will need to be renamed to match requests.
   *
   * The project templates assume the web root should be named `web`, so
   * if the request is to name it otherwise some manual adjustment will be
   * needed.
   */
  private _needsDocRootRename(): boolean {
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

  public writing(): void {
    this._writeDockerFiles();
    this._writeDockerIgnore();
    this._writeCodeQualityConfig();

    this.debug('Copying .env template file to %s.', `${this.servicePath}/.env`);
    this.fs.copy(
      this.templatePath('_env'),
      this.destinationPath(`${this.servicePath}/.env`),
    );
  }

  public async scaffolding(): Promise<void> {
    await this._scaffoldProject();
  }

  public async default(): Promise<void> {
    this._standardizeComposerJson();
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
   * Create necessary Docker files.
   */
  private _writeDockerFiles(): void {
    const needsMemcached = this.options.plugins.cache === 'Memcache';

    // The Pantheon template doesn't create a load.environment.php file, so we have to
    // account for that lest the Docker build fail (or worse, we remove the ability to load
    // env vars when using drupal-composer).
    const sourceFiles =
      this.projectType === ProjectType.Drupal8 ? ['load.environment.php'] : [];

    const drupalDockerfile = createDrupalDockerfile({
      memcached: needsMemcached,
      tag: this.latestDrupalTag,
      documentRoot: this.documentRoot,
      gesso: Boolean(this.useGesso),
      sourceFiles,
    });

    const drushDockerfile = createDrushDockerfile({
      memcached: needsMemcached,
      tag: this.latestDrushTag,
    });

    this.debug(
      'Writing Drupal Dockerfile to %s.',
      `${this.servicePath}/Dockerfile`,
    );
    this.fs.write(
      this.destinationPath(`${this.servicePath}/Dockerfile`),
      drupalDockerfile.render(),
    );

    this.debug('Writing Drush Dockerfile to %s.', 'services/drush/Dockerfile');
    this.fs.write(
      this.destinationPath('services/drush/Dockerfile'),
      drushDockerfile.render(),
    );
  }

  /**
   * Assemble multiple sources for dockerignore rules.
   *
   * Assemble multiple sources for dockerignore rules since nested
   * dockerignore files are not respected.
   *
   * @todo Add support to help maintain existing custom rules.
   */
  private _writeDockerIgnore(): void {
    // Use the provided files from the repository if installing from the repository.
    // This will avoid conflicts in the templates and the repository while also
    // allowing the files to be created on existing projects not installing from the
    // repository templates.
    if (!this.shouldInstall) {
      return;
    }

    const drupalDockerIgnore = new IgnoreEditor();

    // Bubble up Gesso dockerignore rules.
    if (this.useGesso) {
      if (
        this.existsDestination(
          `${this.servicePath}/${gessoDrupalPath}/.gitignore`,
        )
      ) {
        this.debug(
          'Adding contents of %s to the .dockerignore file.',
          `${this.servicePath}/${gessoDrupalPath}/.gitignore`,
        );
        drupalDockerIgnore.addContentsOfFile({
          content: this.readDestination(
            `${this.servicePath}/${gessoDrupalPath}/.gitignore`,
          ),
          heading: 'Gesso Assets',
          path: gessoDrupalPath,
        });
      } else {
        this.warning(
          'Gesso was selected for use, but the .gitignore file at %s could not be found. There may be an error.',
          `${this.servicePath}/${gessoDrupalPath}/.gitignore`,
        );
      }
    }

    // Incorporate gitignore rules.
    if (this.existsDestination(`${this.servicePath}/.gitignore`)) {
      this.debug(
        'Adding contents of %s to the .dockerignore file.',
        `${this.servicePath}/.gitignore`,
      );
      drupalDockerIgnore.addContentsOfFile({
        content: this.readDestination(`${this.servicePath}/.gitignore`),
        heading: 'Drupal',
        path: '/',
      });
    }

    // Add Web Starter custom rules.
    // Serialize the drupalDockerIgnore content for inclusion into the
    // template being rendered since template content cannot be rendered
    // to a string and appended using the IgnoreEditor solution.
    this.debug(
      'Rendering .dockerignore template to %s.',
      `${this.servicePath}/.dockerignore`,
    );
    this.renderTemplate(
      this.templatePath('_dockerignore.ejs'),
      this.destinationPath(`${this.servicePath}/.dockerignore`),
      {
        documentRoot: this.documentRoot,
        inheritedRules: drupalDockerIgnore.serialize(),
      },
    );
  }
}
