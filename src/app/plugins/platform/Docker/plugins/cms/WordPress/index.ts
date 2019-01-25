import dedent from 'dedent';
import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import createGessoDockerfile from '../../../createGessoDockerfile';
import createPHPDockerfile from '../../../createPHPDockerfile';
import installGesso from '../../../installGesso';
import getLatestNodeTag from '../../../registry/getLatestNodeTag';
import getLatestPhpCliTag from '../../../registry/getLatestPhpCliTag';
import getLatestWordPressTags from '../../../registry/getLatestWordPressTags';
import spawnComposer from '../../../spawnComposer';

import createComposerFile from './createComposerFile';
import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';

class WordPress extends Generator {
  // Written out in initializing phase
  private latestWpTag!: string;
  private latestWpCliTag!: string;
  private latestNodeTag!: string;
  private latestPhpTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;
  private themeName!: string;

  private usesWpStarter: boolean | undefined = true;
  // Currently unused
  // private usesWpCfm: boolean | undefined = true;
  private shouldInstallWordPress: boolean | undefined = false;
  private shouldInstallGesso: boolean | undefined = false;

  async initializing() {
    const [latestNodeTag, { cli, wordpress }, latestPhpTag] = await Promise.all(
      [getLatestNodeTag(), getLatestWordPressTags(), getLatestPhpCliTag()],
    );

    this.latestNodeTag = latestNodeTag;
    this.latestWpCliTag = cli;
    this.latestWpTag = wordpress;
    this.latestPhpTag = latestPhpTag;
  }

  async prompting() {
    const {
      documentRoot,
      wpThemeName,
      wpStarter,
      // NB. Option currently unused
      // wpCfm,
      shouldInstallWordPress,
      shouldInstallGesso,
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
        type: 'input',
        name: 'wpThemeName',
        validate: name => name !== '' && validFilename(name),
        message: 'What is the theme name?',
        default: 'gesso',
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
        name: 'useCapistrano',
        message: 'Deploy with Capistrano?',
        default: true,
        store: true,
      },
      {
        type: 'confirm',
        name: 'shouldInstallWordPress',
        message: 'Install WordPress?',
        default: false,
        when: !this.options.skipInstall,
      },
      {
        type: 'confirm',
        name: 'shouldInstallGesso',
        message: 'Install Gesso?',
        default: false,
        when: answers => answers.shouldInstallWordPress,
      },
    ]);

    this.documentRoot = documentRoot;
    this.themeName = wpThemeName;
    this.shouldInstallWordPress = shouldInstallWordPress;
    this.shouldInstallGesso = shouldInstallGesso;
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

    // Various important Gesso-related paths
    const themePath = posix.join(
      varHtmlPath,
      'wp-content/themes',
      this.themeName,
    );
    const patternLabPublicPath = posix.join(themePath, 'pattern-lab/public');
    const gessoCssPath = posix.join(themePath, 'css');

    const editor = this.options.composeEditor as ComposeEditor;

    // Volumes needed by WordPress and Gesso.
    // * fs-data: sites/default/files
    //   Needed so that we can persist saved files across containers.
    // * gesso-public: <theme>/pattern-lab/public
    //   Needed to share the PL output with nginx, WordPress, and the PL builder
    // * gesso-css: <theme>/css
    //   Needed to share the compiled sass with nginx, WordPress, and the Gesso container
    const filesystemVolume = editor.ensureVolume('fs-data');
    const gessoPublicVolume = editor.ensureVolume('gesso-public');
    const gessoCssVolume = editor.ensureVolume('gesso-css');

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
        {
          type: 'volume',
          source: gessoPublicVolume,
          target: patternLabPublicPath,
          read_only: true,
        },
        {
          type: 'volume',
          source: gessoCssVolume,
          target: gessoCssPath,
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
        {
          type: 'volume',
          source: gessoCssVolume,
          target: gessoCssPath,
        },
        {
          type: 'volume',
          source: gessoPublicVolume,
          target: patternLabPublicPath,
        },
      ],
    });

    editor.addMysqlService();
    editor.addMailhogService();

    // Gesso + PL building

    // posix.join() strips leading './' prefixes, which Compose needs to distinguish between named
    // volumes and bind mounts in shorthand syntax. (See longer comment in the Drupal generator.)
    const hostThemePath =
      './' +
      posix.join(
        'services/wordpress',
        this.documentRoot,
        'wp-content/themes',
        this.themeName,
      );

    // Node container for sass...
    editor.addService('gesso', {
      build: {
        context: hostThemePath,
        dockerfile: '$PWD/services/gesso/Dockerfile',
      },
      command: ['grunt', 'gessoWatch'],
      init: true,
      volumes: [
        createBindMount(hostThemePath + '/images', '/app/images'),
        createBindMount(hostThemePath + '/pattern-lab', '/app/pattern-lab'),
        createBindMount(hostThemePath + '/js', '/app/js'),
        {
          type: 'volume',
          source: gessoPublicVolume,
          target: '/app/pattern-lab/public',
        },
        {
          type: 'volume',
          source: gessoCssVolume,
          target: '/app/css',
        },
      ],
    });

    // ... and a PHP container for PL.
    editor.addService('pattern-lab', {
      image: 'php:' + this.latestPhpTag,
      command: [
        'php',
        '-dmemory_limit=-1',
        'core/console',
        '--watch',
        '--no-procs',
      ],
      init: true,
      volumes: [
        createBindMount(hostThemePath + '/pattern-lab', '/app'),
        { type: 'volume', source: gessoPublicVolume, target: '/app/public' },
      ],
      working_dir: '/app',
    });

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
    this.fs.write(
      this.destinationPath('services/gesso/Dockerfile'),
      createGessoDockerfile(this.latestNodeTag).render(),
    );

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

    // As with the Drupal8 generator, we don't use anything filesystem when building
    // this image, so we just ignore everything.
    const wpDockerIgnore = new IgnoreEditor();
    wpDockerIgnore.addEntry('*');
    this.fs.write(
      this.destinationPath('services/wordpress'),
      wpDockerIgnore.serialize(),
    );
  }

  private async _installWordPress() {
    if (!this.shouldInstallWordPress) {
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

  private async _installGesso() {
    if (!this.shouldInstallGesso) {
      return;
    }

    return installGesso({
      branch: '2.x',
      repository: 'gesso-wp',
      targetPath: this.destinationPath(
        'services/wordpress',
        this.documentRoot,
        'wp-content/themes',
        this.themeName,
      ),
    });
  }

  async install() {
    await this._installWordPress();
    await this._installGesso();
  }
}

export = WordPress;
