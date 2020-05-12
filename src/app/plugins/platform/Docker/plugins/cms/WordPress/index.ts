import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';
import decompress from 'decompress';
import fetch from 'node-fetch';
import { URL } from 'url';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import getLatestWordPressCliTag from '../../../registry/getLatestWordPressCliTag';
import getLatestWordPressTag from '../../../registry/getLatestWordPressTag';
import spawnComposer from '../../../spawnComposer';
import { enableXdebug, xdebugEnvironment } from '../../../xdebug';

import createComposerFile from './createComposerFile';
import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';
import createWordPressDockerfile from './createWordPressDockerfile';
import createWordPressCliDockerfile from './createWordPressCliDockerfile';

const gessoWPDependencies: ReadonlyArray<string> = ['timber-library'];

class WordPress extends Generator {
  // Written out in initializing phase
  private latestWpTag!: string;
  private latestWpCliTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;

  private usesWpStarter: boolean | undefined = true;
  private usesWpCfm: boolean | undefined = true;
  private usesGesso: boolean | undefined = true;

  private shouldInstall: boolean | undefined = false;

  async initializing() {
    const [latestWpTag, latestWpCliTag] = await Promise.all([
      getLatestWordPressTag(),
      getLatestWordPressCliTag(),
    ]);

    this.latestWpCliTag = latestWpCliTag;
    this.latestWpTag = latestWpTag;
    this.options.force = true;
  }

  async prompting() {
    const {
      documentRoot,
      wpStarter,
      wpCfm,
      shouldInstallWordPress,
      useGesso,
      useCapistrano,
    } = await this.prompt([
      {
        type: 'input',
        name: 'documentRoot',
        validate: name => name !== '' && validFilename(name),
        message: 'What is the document root?',
        default: 'public',
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
    this.usesWpStarter = wpStarter;
    this.usesWpCfm = wpCfm;
    this.usesGesso = useGesso;

    if (useCapistrano) {
      this.composeWith(this.options.capistrano, {
        platform: 'wordpress',
        name: this.options.name,
        appWebroot: posix.join('services/wordpress', documentRoot),
        webroot: documentRoot,
        config: {
          wordpress_wpcfm: Boolean(this.usesWpCfm),
        },
        linkedDirectories: [
          `services/wordpress/${documentRoot}/wp-content/uploads`,
          `services/wordpress/${documentRoot}/wp-content/upgrade`,
          `services/wordpress/${documentRoot}/wp-content/wflogs`,
        ],
        linkedFiles: wpStarter ? ['services/wordpress/.env'] : [],
      });
    }

    if (useGesso) {
      this.composeWith(require.resolve('../../gesso/GessoWordPress'), {
        documentRoot: this.documentRoot,
        composeEditor: this.options.composeEditor,
        composeCliEditor: this.options.composeCliEditor,
      });
    }
  }

  configuring() {
    this.fs.copyTpl(
      this.templatePath('nginx.conf.ejs'),
      this.destinationPath('services/nginx/default.conf'),
      { documentRoot: this.documentRoot },
    );

    // Both WordPress and nginx containers use /var/www/html as the root of the app,
    // so these paths can be shared between both service definitions in this file.
    const varHtmlPath = posix.join('/var/www/html/', this.documentRoot);

    // Path to WordPress uploads
    const uploadPath = posix.join(varHtmlPath, 'wp-content/uploads');

    const editor = this.options.composeEditor as ComposeEditor;

    // Volumes needed by WordPress (and shared with nginx).
    // * fs-data: sites/default/files
    //   Needed so that we can persist saved files across containers.
    const filesystemVolume = editor.ensureVolume('fs-data');

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

    // Set up the environment variables to be read in config
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
      'exec php-fpm',
    ].join('\n');

    editor.addService('wordpress', {
      build: './services/wordpress',
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

    editor.addMysqlService();
    editor.addMailhogService();

    const cliEditor = this.options.composeCliEditor as ComposeEditor;

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

    if (this.usesWpStarter) {
      cliEditor.addComposer('services/wordpress');
    }
  }

  async writing() {
    // For project not using wp-starter, don't bother writing out composer.json
    // or a .env file.
    if (this.usesWpStarter) {
      this.fs.extendJSON(
        this.destinationPath('services/wordpress/composer.json'),
        createComposerFile(this.options.name, this.documentRoot),
      );

      const dotenvPath = this.destinationPath('services/wordpress/.env');
      if (!this.fs.exists(dotenvPath)) {
        this.fs.copy(this.templatePath('_env'), dotenvPath);
      }

      const prodEnvPath = `${dotenvPath}.production`;
      if (!this.fs.exists(prodEnvPath)) {
        this.fs.copy(this.templatePath('_env.production'), prodEnvPath);
      }
    } else {
      const wpConfigPath = this.destinationPath(
        'services/wordpress',
        this.documentRoot,
        'wp-config.php',
      );

      if (!this.fs.exists(wpConfigPath)) {
        this.fs.copyTpl(this.templatePath('wp-config.php.ejs'), wpConfigPath, {
          hashes: await getHashes(),
        });
      }
    }

    const needsMemcached = this.options.plugins.cache === 'Memcache';

    const wpDockerfile = createWordPressDockerfile({
      tag: this.latestWpTag,
      memcached: needsMemcached,
      documentRoot: this.documentRoot,
      gesso: Boolean(this.usesGesso),
      composer: Boolean(this.usesWpStarter),
    });

    this.fs.write(
      this.destinationPath('services/wordpress/Dockerfile'),
      wpDockerfile.render(),
    );

    const cliDockerfile = createWordPressCliDockerfile({
      tag: this.latestWpCliTag,
      memcached: needsMemcached,
    });

    this.fs.write(
      this.destinationPath('services/wp-cli/Dockerfile'),
      cliDockerfile.render(),
    );

    // For projects NOT using the web-starter, add a wp-cli.yml file.
    if (!this.usesWpStarter) {
      this.fs.copyTpl(
        this.templatePath('wp-cli-nostarter.yml.ejs'),
        this.destinationPath('services/wordpress/wp-cli.yml'),
        { documentRoot: this.documentRoot },
      );
    }
  }

  private async _installWordPress() {
    if (!this.shouldInstall) {
      return;
    }

    if (this.usesWpStarter) {
      const wpRoot = this.destinationPath('services/wordpress');
      await spawnComposer(['install'], { cwd: wpRoot });
    } else {
      const wpRoot = this.destinationPath(
        'services/wordpress',
        this.documentRoot,
      );

      await installWordPressSource(wpRoot);
    }
  }

  /**
   * Install plugin from WordPress Packagist with Composer.
   */
  private async _installWithComposer(pluginName: string) {
    await spawnComposer(
      ['require', `wpackagist-plugin/${pluginName}`, '--ignore-platform-reqs'],
      {
        cwd: this.destinationPath('services/wordpress'),
      },
    );
  }

  /**
   * Install plugin from WordPress plugin repo as a zip.
   */
  private async _installFromWPRepo(pluginName: string) {
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

    await decompress(buffer, destinationPath, { strip: 1 });
  }

  private async _installGessoDependencies() {
    if (!this.shouldInstall) {
      return;
    }

    const install: (pluginName: string) => Promise<void> = this.usesWpStarter
      ? pluginName => this._installWithComposer(pluginName)
      : pluginName => this._installFromWPRepo(pluginName);

    // Install required dependencies to avoid Gesso crashing when enabled
    for (const plugin of gessoWPDependencies) {
      await install(plugin);
    }
  }

  async install() {
    await this._installWordPress();

    if (this.usesGesso) {
      await this._installGessoDependencies();
    }

    // Create the .dockerignore file here, after everything has been installed
    const wpIgnorePath = this.destinationPath('services/wordpress/.gitignore');

    const gitignoreEditor = new IgnoreEditor();
    if (this.fs.exists(wpIgnorePath)) {
      gitignoreEditor.addEntry(this.fs.read(wpIgnorePath));
      gitignoreEditor.addSeparator();
      gitignoreEditor.addComment('Ignore Composer credentials configuration.');
      gitignoreEditor.addEntry('auth.json');
    }

    // Append the additional gitignore entries to the WordPress service gitignore file.
    this.fs.write(
      this.destinationPath(wpIgnorePath),
      gitignoreEditor.serialize(),
    );

    const ignoreEditor = new IgnoreEditor();
    if (this.fs.exists(wpIgnorePath)) {
      ignoreEditor.addContentsOfFile({
        heading: 'WP Starter',
        content: this.fs.read(wpIgnorePath),
      });

      if (this.usesGesso) {
        const path = posix.join(this.documentRoot, 'wp-content/themes/gesso');
        ignoreEditor.addEntry(`!${path}`);
      }
    }

    this.fs.write(
      this.destinationPath('services/wordpress/.dockerignore'),
      ignoreEditor.serialize(),
    );
  }
}

export = WordPress;
