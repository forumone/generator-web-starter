import dedent from 'dedent';
import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import createPHPDockerfile from '../../../createPHPDockerfile';
import getLatestWordPressTags from '../../../registry/getLatestWordPressTags';
import spawnComposer from '../../../spawnComposer';

import createComposerFile from './createComposerFile';
import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';

class WordPress extends Generator {
  // Written out in initializing phase
  private latestWpTag!: string;
  private latestWpCliTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;

  private usesWpStarter: boolean | undefined = true;
  // Currently unused
  // private usesWpCfm: boolean | undefined = true;

  private shouldInstall: boolean | undefined = false;

  async initializing() {
    const { cli, wordpress } = await getLatestWordPressTags();

    this.latestWpCliTag = cli;
    this.latestWpTag = wordpress;
  }

  async prompting() {
    const {
      documentRoot,
      wpStarter,
      // NB. Option currently unused
      // wpCfm,
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
    // this.usesWpCfm = wpCfm;

    if (useCapistrano) {
      this.composeWith(this.options.capistrano, {
        platform: 'wordpress',
        name: this.options.name,
        appWebroot: posix.join('services/wordpress', documentRoot),
        webroot: documentRoot,
        config: {},
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

    const envFile = this.usesWpStarter
      ? { env_file: './services/wordpress/.env' }
      : undefined;

    // Projects not based on wp-starter won't have a .env file, so we have to
    // ensure a minimally-compatible runtime environment inside the container.
    const initialEnvironment = this.usesWpStarter
      ? undefined
      : {
          DB_HOST: 'mysql:3306',
          DB_NAME: 'web',
          DB_USER: 'web',
          DB_PASSWORD: 'web',
          SMTPHOST: 'mailhog:1025',
        };

    editor.addService('wordpress', {
      build: './services/wordpress',
      depends_on: ['mysql'],
      command: [
        '-c',
        dedent`
          chmod -R 0777 ${uploadPath}
          exec bash ./wp-entrypoint.sh
        `,
      ],
      entrypoint: '/bin/bash',
      ...envFile,
      environment: {
        ...initialEnvironment,
        // This is a shell substitution being used in Docker Compose, not a false negative being
        // flagged by TSLint.
        // tslint:disable-next-line:no-invalid-template-strings
        XDEBUG_CONFIG: 'remote_host=${F1_XDEBUG_REMOTE:-127.0.0.1}',
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
      image: 'wordpress:' + this.latestWpCliTag,
      volumes: [createBindMount('./services/wordpress', '/var/www/html')],
    });

    if (this.usesWpStarter) {
      cliEditor.addComposer('services/wordpress');
    }
  }

  async writing() {
    this.fs.copy(
      this.templatePath('wp-entrypoint.sh'),
      this.destinationPath('services/wordpress/wp-entrypoint.sh'),
    );

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

    const wpDockerfile = createPHPDockerfile({
      from: { image: 'wordpress', tag: this.latestWpTag },
      xdebug: true,
    });

    this.fs.write(
      this.destinationPath('services/wordpress/Dockerfile'),
      wpDockerfile.render(),
    );

    // As with the Drupal8 generator, we don't use anything from the filesystem when
    // building this image, so we just ignore everything.
    const ignore = new IgnoreEditor();
    ignore.addEntry('*');
    this.fs.write(
      this.destinationPath('services/wordpress/.dockerignore'),
      ignore.serialize(),
    );
  }

  private async _installWordPress() {
    if (!this.shouldInstall) {
      return;
    }

    if (this.usesWpStarter) {
      const wpRoot = this.destinationPath('services/wordpress');
      await spawnComposer(['install', '--ignore-platform-reqs'], {
        cwd: wpRoot,
      });
    } else {
      const wpRoot = this.destinationPath(
        'services/wordpress',
        this.documentRoot,
      );

      await installWordPressSource(wpRoot);
    }
  }

  async install() {
    await this._installWordPress();
  }
}

export = WordPress;
