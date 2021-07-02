import { posix } from 'path';
import validFilename from 'valid-filename';
import decompress from 'decompress';
import fetch from 'node-fetch';
import { URL } from 'url';

import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import getLatestWordPressCliTag from '../../../registry/getLatestWordPressCliTag';
import getLatestWordPressTag from '../../../registry/getLatestWordPressTag';
import {
  enableXdebug,
  enableXdebugProfiler,
  xdebugEnvironment,
} from '../../../xdebug';

import createComposerFile from './createComposerFile';
import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';
import createWordPressDockerfile from './createWordPressDockerfile';
import createWordPressCliDockerfile from './createWordPressCliDockerfile';
import {
  CmsType,
  PhpCmsGenerator,
  ProjectType,
} from '../../../phpCmsGenerator';

const gessoWPDependencies: ReadonlyArray<string> = ['timber-library'];

class WordPress extends PhpCmsGenerator {
  cmsType = CmsType.WordPress;
  servicePath = `services/${this.cmsType}`;

  // Written out in initializing phase.
  latestWpTag!: string;
  latestWpCliTag!: string;

  // Assigned to in prompting phase
  documentRoot = 'web';
  projectType!: ProjectType.WordPress;
  projectUpstream!: string;

  useWpStarter: boolean | undefined = true;
  useWpCfm: boolean | undefined = true;

  public async initializing(): Promise<void> {
    const [latestWpTag, latestWpCliTag] = await Promise.all([
      getLatestWordPressTag(),
      getLatestWordPressCliTag(),
    ]);
    this.debug(
      'Loaded latest WordPress (%s) and WP-CLI (%s) tags.',
      latestWpTag,
      latestWpCliTag,
    );

    this.latestWpCliTag = latestWpCliTag;
    this.latestWpTag = latestWpTag;
    this.options.force = true;
  }

  public async prompting(): Promise<void> {
    const {
      documentRoot,
      wpStarter,
      wpCfm,
      shouldInstallWordPress,
      useGesso,
      useCapistrano,
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
        name: 'wpStarter',
        message: 'Does this project use Composer and wp-starter?',
        default: true,
        store: true,
      },
      {
        type: 'confirm',
        name: 'wpCfm',
        message: 'Does this project use WP-CFM?',
        default: true,
        when: answers => answers.wpStarter,
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
        name: 'shouldInstallWordPress',
        message: 'Install WordPress?',
        store: true,
        default: () => {
          const servicePath = this.destinationPath('services/wordpress');
          return !this.fs.exists(servicePath);
        },
        when: !this.options.skipInstall,
      },
    ]);

    this.documentRoot = documentRoot;
    this.shouldInstall = shouldInstallWordPress;
    this.useWpStarter = wpStarter;
    this.useWpCfm = wpCfm;
    this.useGesso = useGesso;

    if (useCapistrano) {
      const capistranoOptions = {
        platform: 'wordpress',
        name: this.options.name,
        appWebroot: posix.join('services/wordpress', documentRoot),
        webroot: documentRoot,
        uninteractive: this.options.uninteractive,
        config: {
          wordpress_wpcfm: Boolean(this.useWpCfm),
        },
        linkedDirectories: [
          `services/wordpress/${documentRoot}/wp-content/uploads`,
          `services/wordpress/${documentRoot}/wp-content/upgrade`,
          `services/wordpress/${documentRoot}/wp-content/wflogs`,
        ],
        linkedFiles: wpStarter ? ['services/wordpress/.env'] : [],
      };
      this.debug(
        'Composing with Capistrano generator using options: %O',
        capistranoOptions,
      );
      this.composeWith(this.options.capistrano, capistranoOptions);
    }

    if (useGesso) {
      const gessoOptions = {
        documentRoot: this.documentRoot,
        composeEditor: this.options.composeEditor,
        composeCliEditor: this.options.composeCliEditor,
        uninteractive: this.options.uninteractive,
      };
      this.debug(
        'Composing with Gesso generator with options: %O',
        gessoOptions,
      );
      this.composeWith(
        require.resolve('../../gesso/GessoWordPress'),
        gessoOptions,
      );
    }
  }

  public configuring(): void {
    this._prepareDockerComposeServices();
    this._prepareCodacyComposeServices();
  }

  protected _prepareDockerComposeServices(): void {
    const editor = this.options.composeEditor as ComposeEditor;

    // Both WordPress and nginx containers use /var/www/html as the root of the app,
    // so these paths can be shared between both service definitions in this file.
    const varHtmlPath = posix.join('/var/www/html/', this.documentRoot);

    // Path to WordPress uploads
    const uploadPath = posix.join(varHtmlPath, 'wp-content/uploads');

    // Volumes needed by WordPress (and shared with nginx).
    // * fs-data: sites/default/files
    //   Needed so that we can persist saved files across containers.
    const filesystemVolume = editor.ensureVolume('fs-data');

    this._addNginxService(editor, uploadPath, filesystemVolume);

    // Set up the environment variables to be read in config.
    const initialEnvironment = {
      DB_HOST: 'mysql:3306',
      DB_NAME: 'web',
      DB_USER: 'web',
      DB_PASSWORD: 'web',
      SMTPHOST: 'mailhog:1025',
    };

    // Use an array here because, for some odd reason, dedent gets confused about how
    // string indentation works otherwise.
    const wpEntryCommand = [
      `chmod -R 0777 ${uploadPath}`,
      enableXdebug,
      enableXdebugProfiler,
      'exec php-fpm',
    ].join('\n');

    this.debug('Adding wordpress service.');
    editor.addService('wordpress', {
      build: { context: './services/wordpress', target: 'dev' },
      depends_on: ['mysql'],
      command: ['-c', wpEntryCommand],
      entrypoint: '/bin/sh',
      environment: {
        ...initialEnvironment,
        ...xdebugEnvironment,
      },
      volumes: [
        createBindMount('./services/wordpress', '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolume,
          target: uploadPath,
        },
      ],
    });

    this.debug('Adding MySQL service.');
    editor.addMysqlService();

    this.debug('Adding Mailhog service.');
    editor.addMailhogService();

    const cliEditor = this.options.composeCliEditor as ComposeEditor;

    this.debug('Adding wp-cli service.');
    cliEditor.addService('wp', {
      build: './services/wp-cli',
      volumes: [
        createBindMount('./services/wordpress', '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolume,
          target: uploadPath,
        },
      ],
    });

    if (this.useWpStarter) {
      this.debug('Adding Composer CLI service.');
      cliEditor.addComposer('services/wordpress');
    }
  }

  protected _addNginxService(
    editor: ComposeEditor,
    uploadPath: string,
    filesystemVolume: string,
  ): void {
    this.debug(
      'Copying nginx config template to %s.',
      'services/nginx/default.conf',
    );
    this.fs.copyTpl(
      this.templatePath('nginx.conf.ejs'),
      this.destinationPath('services/nginx/default.conf'),
      { documentRoot: this.documentRoot },
    );

    this.debug('Adding Nginx service.');
    editor.addNginxService({
      depends_on: ['wordpress'],
      volumes: [
        createBindMount(
          './services/nginx/default.conf',
          '/etc/nginx/conf.d/default.conf',
          { readOnly: true },
        ),
        createBindMount('./services/wordpress', '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolume,
          target: uploadPath,
          read_only: true,
        },
      ],
    });
  }

  /**
   * Complete scaffolding and customization steps for the Drupal service directory.
   */
  protected async _doScaffold(): Promise<void> {
    this.info('Creating WordPress project.');
    await this._createComposerProject();

    const webRoot = this.destinationPath(this.servicePath);

    // The project scaffolding tools assume the web root should be named `web`,
    // so various references need to be replaced with the designated rename if
    // this is not the name selected for the project.
    if (this._needsDocRootRename()) {
      this.debug('Replacing docroot references in generated files.');
      await this._renameWebRoot(this.documentRoot, webRoot);
    }
  }

  public async scaffolding(): Promise<void> {
    await this._scaffoldProject();
  }

  public async writing(): Promise<void> {
    // For project not using wp-starter, don't bother writing out composer.json
    // or a .env file.
    if (this.useWpStarter) {
      this.debug('Rewriting services/wordpress/composer.json.');
      this.fs.extendJSON(
        this.destinationPath('services/wordpress/composer.json'),
        createComposerFile(this.options.name, this.documentRoot),
      );

      const dotenvPath = this.destinationPath('services/wordpress/.env');
      if (!this.fs.exists(dotenvPath)) {
        this.debug('Copying .env template to %s.', dotenvPath);
        this.fs.copy(this.templatePath('_env'), dotenvPath);
      }

      const prodEnvPath = `${dotenvPath}.production`;
      if (!this.fs.exists(prodEnvPath)) {
        this.debug('Copying .env.production template to %s.', prodEnvPath);
        this.fs.copy(this.templatePath('_env.production'), prodEnvPath);
      }
    } else {
      const wpConfigPath = this.destinationPath(
        'services/wordpress',
        this.documentRoot,
        'wp-config.php',
      );

      if (!this.fs.exists(wpConfigPath)) {
        this.debug('Copying wp-config.php template to %s.', wpConfigPath);
        this.fs.copyTpl(this.templatePath('wp-config.php.ejs'), wpConfigPath, {
          hashes: await getHashes(),
        });
      }
    }

    // For projects NOT using the WPStarter, add a wp-cli.yml file.
    if (!this.useWpStarter) {
      this.debug('Creating wp-cli.yml file since WpStarter is not being used.');
      this.fs.copyTpl(
        this.templatePath('wp-cli-nostarter.yml.ejs'),
        this.destinationPath('services/wordpress/wp-cli.yml'),
        { documentRoot: this.documentRoot },
      );
    }

    this._writeDockerFiles();
    this._writeCodeQualityConfig();
  }

  private _writeDockerFiles(): void {
    const needsMemcached = this.options.plugins.cache === 'Memcache';

    const wpDockerfile = createWordPressDockerfile({
      tag: this.latestWpTag,
      memcached: needsMemcached,
      documentRoot: this.documentRoot,
      gesso: Boolean(this.useGesso),
      composer: Boolean(this.useWpStarter),
    });

    this.debug(
      'Writing WordPress Dockerfile to services/wordpress/Dockerfile.',
    );
    this.fs.write(
      this.destinationPath('services/wordpress/Dockerfile'),
      wpDockerfile.render(),
    );

    const cliDockerfile = createWordPressCliDockerfile({
      tag: this.latestWpCliTag,
      memcached: needsMemcached,
    });

    this.debug('Writing wp-cli Dockerfile to services/wp-cli/Dockerfile.');
    this.fs.write(
      this.destinationPath('services/wp-cli/Dockerfile'),
      cliDockerfile.render(),
    );
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
      },
    );

    this.debug(
      'Rendering phpcs.xml.dist template to %s.',
      'services/wordpress/phpcs.xml.dist',
    );
    this.renderTemplate(
      this.templatePath('phpcs.xml.dist.ejs'),
      this.destinationPath('services/wordpress/phpcs.xml.dist'),
      {
        documentRoot: this.documentRoot,
        useGesso: this.useGesso,
      },
    );

    this.debug(
      'Rendering .phpmd.xml.dist template to %s.',
      'services/wordpress/.phpmd.xml.dist',
    );
    this.renderTemplate(
      this.templatePath('_phpmd.xml.dist.ejs'),
      this.destinationPath('services/wordpress/.phpmd.xml.dist'),
      {
        documentRoot: this.documentRoot,
      },
    );
  }

  private async _installWordPress(): Promise<void> {
    if (!this.shouldInstall) {
      return;
    }

    if (this.useWpStarter) {
      const wpRoot = this.destinationPath('services/wordpress');
      this.debug('Spawning Composer install command in %s.', wpRoot);
      await this.spawnComposer(['install'], {
        cwd: wpRoot,
      });
    } else {
      const wpRoot = this.destinationPath(
        'services/wordpress',
        this.documentRoot,
      );

      this.debug('Installing WordPress source in %s.', wpRoot);
      await installWordPressSource(wpRoot);
    }
  }

  /**
   * Install plugin from WordPress Packagist with Composer.
   */
  private async _installWithComposer(pluginName: string): Promise<void> {
    const packageName = `wpackagist-plugin/${pluginName}`;
    this.debug(
      'Spawning Composer command to install WordPress plugin %s.',
      packageName,
    );
    await this.spawnComposer(
      ['require', packageName, '--ignore-platform-reqs'],
      {
        cwd: this.destinationPath('services/wordpress'),
      },
    );
  }

  /**
   * Install plugin from WordPress plugin repo as a zip.
   */
  private async _installFromWPRepo(pluginName: string): Promise<void> {
    this.debug('Installing plugin %s from repo.', pluginName);
    const endpoint = new URL('https://downloads.wordpress.org');
    endpoint.pathname = posix.join('plugin', `${pluginName}.latest-stable.zip`);
    const response = await fetch(String(endpoint));
    if (!response.ok) {
      const { status, statusText, url } = response;
      throw new Error(`fetch(${url}): ${status} ${statusText}`);
    }

    const buffer = await response.buffer();

    const destinationPath = posix.join(
      'services',
      'wordpress',
      this.documentRoot,
      'wp-content',
      'plugins',
      pluginName,
    );

    this.debug(
      'Decompressing downloaded plugin from %s to %s.',
      endpoint.pathname,
      destinationPath,
    );
    await decompress(buffer, destinationPath, { strip: 1 });
  }

  private async _installGessoDependencies(): Promise<void> {
    if (!this.shouldInstall) {
      return;
    }

    const install: (pluginName: string) => Promise<void> = this.useWpStarter
      ? pluginName => this._installWithComposer(pluginName)
      : pluginName => this._installFromWPRepo(pluginName);

    // Install required dependencies to avoid Gesso crashing when enabled.
    for (const plugin of gessoWPDependencies) {
      this.debug('Installing Gesso dependency %s.', plugin);
      await install(plugin);
    }
  }

  public async install(): Promise<void> {
    this.debug('Installing WordPress.');
    await this._installWordPress();

    if (this.useGesso) {
      this.debug('Installing Gesso dependencies.');
      await this._installGessoDependencies();
    }

    // Generate the related .gitignore and .dockerignore files.
    this.debug('Generating ignore files.');
    this._createIgnoreFiles();
  }

  /**
   * Render the templated .gitignore and .dockerignore files for the project.
   *
   * @todo Implement support for existing ignore files in projects.
   */
  private _createIgnoreFiles(): void {
    // Customize the ignore files file here, after everything has been installed.
    const wpGitIgnorePath = this.destinationPath(
      'services/wordpress/.gitignore',
    );
    const wpDockerIgnorePath = this.destinationPath(
      'services/wordpress/.dockerignore',
    );

    // Prepare template variables for the template rendering.
    const templateVars: {
      documentRoot: string;
      usesGesso?: boolean;
      gessoPath?: string;
      usesWpCfm?: boolean;
      customRules: Array<string>;
    } = {
      customRules: [],
      documentRoot: this.documentRoot,
      usesGesso: this.useGesso,
      usesWpCfm: this.useWpCfm,
    };

    if (this.useGesso) {
      const path = posix.join(this.documentRoot, 'wp-content/themes/gesso');
      templateVars.gessoPath = `${path}`;
    }

    // Warn about existing .gitignore files.
    // @todo Implement support to maintain existing custom rules.
    if (this.fs.exists(wpGitIgnorePath)) {
      this.log(
        'Editing existing .gitignore files is not fully supported. Please manually review any chages to %s.',
        [wpGitIgnorePath],
      );
    }

    // Warn about existing .dockerignore files.
    // @todo Implement support to maintain existing custom rules.
    if (this.fs.exists(wpDockerIgnorePath)) {
      this.log(
        'Editing existing .dockerignore files is not fully supported. Please manually review any chages to %s.',
        [wpDockerIgnorePath],
      );
    }

    // Render the ignorefile templates.
    this.debug('Rendering .gitignore template to %s.', wpGitIgnorePath);
    this.debug('Rendering .dockerignore template to %s.', wpDockerIgnorePath);
    this.renderTemplates(
      [
        {
          destination: wpGitIgnorePath,
          source: this.templatePath('_gitignore.ejs'),
        },
        {
          destination: wpDockerIgnorePath,
          source: this.templatePath('_dockerignore.ejs'),
        },
      ],
      templateVars,
    );
  }
}

export = WordPress;
