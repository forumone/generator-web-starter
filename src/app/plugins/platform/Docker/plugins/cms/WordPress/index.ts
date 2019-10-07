import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import DockerfileHelper from '../../../dockerfile/DockerfileHelper';
import memcached from '../../../dockerfile/memcached';
import xdebug from '../../../dockerfile/xdebug';
import getLatestPhpCliTag from '../../../registry/getLatestPhpCliTag';
import getLatestNodeVersion, {
  Dist,
} from '../../../registry/getLatestNodeRelease';
import getLatestWordPressTags from '../../../registry/getLatestWordPressTags';
import { enableXdebug, xdebugEnvironment } from '../../../xdebug';

import SubgeneratorOptions from './SubgeneratorOptions';

class WordPress extends Generator {
  private cliDockerfile = new DockerfileHelper();
  private dockerfile = new DockerfileHelper();

  // Written out in initializing phase
  private latestWpTag!: string;
  private latestWpCliTag!: string;
  private latestNodeVersion!: Dist;
  private latestPhpTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;
  private useGesso: boolean | undefined;

  private usesWpStarter: boolean | undefined = true;
  private usesWpCfm: boolean | undefined = true;

  async initializing() {
    const [{ cli, wordpress }, php, node] = await Promise.all([
      getLatestWordPressTags(),
      getLatestPhpCliTag(),
      getLatestNodeVersion(),
    ]);

    this.latestWpCliTag = cli;
    this.latestWpTag = wordpress;
    this.latestNodeVersion = node;
    this.latestPhpTag = php;
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
        default: () => {
          const servicePath = this.destinationPath('services/wordpress');
          return !this.fs.exists(servicePath);
        },
        when: !this.options.skipInstall,
      },
    ]);

    this.documentRoot = documentRoot;
    this.useGesso = useGesso;
    this.usesWpStarter = wpStarter;
    this.usesWpCfm = wpCfm;

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

    const options: SubgeneratorOptions = {
      useGesso,
      documentRoot,
      shouldInstall: shouldInstallWordPress,
      dockerfile: this.dockerfile,
      composeEditor: this.options.composeEditor,
      composeCliEditor: this.options.composeCliEditor,
    };

    const subgeneratorPath = this.usesWpStarter ? './WpStarter' : './WpSource';
    this.composeWith(require.resolve(subgeneratorPath), options);
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

    // Use an array here because, for some odd reason, dedent gets confused about how
    // string indentation works otherwise.
    const wpEntryCommand = [
      `chmod -R 0777 ${uploadPath}`,
      enableXdebug,
      'exec bash ./wp-entrypoint.sh',
    ].join('\n');

    editor.addService('wordpress', {
      build: {
        context: './services/wordpress',
        target: 'dev',
      },
      depends_on: ['mysql'],
      command: ['-c', wpEntryCommand],
      entrypoint: '/bin/bash',
      ...envFile,
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

    const dockerfile = this.dockerfile;

    const needsMemcached = this.options.plugins.cache === 'Memcache';
    const dependencies = needsMemcached ? [memcached] : [];

    dockerfile.addBuildStage({
      comment: 'Based stage shared between development and production builds',
      from: { image: 'wordpress', tag: this.latestWpTag, stage: 'base' },
      dependencies,
    });

    dockerfile.addBuildStage({
      comment:
        'Development-only build stage (used to keep XDebug out of production image)',
      from: { image: 'base', stage: 'dev' },
      dependencies: [xdebug],
    });

    if (this.useGesso) {
      dockerfile.addGessoStage({
        comment: 'Build Gesso',
        buildSources: true,
        node: this.latestNodeVersion,
        php: this.latestPhpTag,
        themeRoot: posix.join(this.documentRoot, 'wp-content/themes/gesso'),
      });
    }

    const cliDockerfile = this.cliDockerfile;

    cliDockerfile.addBuildStage({
      from: { image: 'wordpress', tag: this.latestWpCliTag },
      dependencies,
      postBuildCommands: [
        "echo 'memory_limit = -1' >> /usr/local/etc/php/php-cli.ini",
      ],
      runtimeDeps: ['openssh'],
      // Restore the 'www-data' user in the wordpress:cli image
      user: 'www-data',
    });
  }

  async writing() {
    this.fs.copy(
      this.templatePath('wp-entrypoint.sh'),
      this.destinationPath('services/wordpress/wp-entrypoint.sh'),
    );

    this.fs.write(
      this.destinationPath('services/wordpress/Dockerfile'),
      this.dockerfile.render(),
    );

    this.fs.write(
      this.destinationPath('services/wp-cli/Dockerfile'),
      this.cliDockerfile.render(),
    );

    const editor = new IgnoreEditor();

    const gitignorePath = this.destinationPath('services/wordpress/.gitignore');
    if (this.fs.exists(gitignorePath)) {
      editor.addContentsOfFile(this.fs.read(gitignorePath));
    }

    const themeIgnorePath = this.destinationPath(
      'services/wordpress',
      this.documentRoot,
      'wp-content/themes/gesso/.gitignore',
    );
    if (this.fs.exists(themeIgnorePath)) {
      editor.addSeparator();
      editor.addComment('Contents of Gesso .gitignore');
      editor.addContentsOfFile(
        this.fs.read(themeIgnorePath),
        posix.join(this.documentRoot, 'wp-content/themes/gesso'),
      );
    }

    this.fs.write(
      this.destinationPath('services/wordpress/.dockerignore'),
      editor.serialize(),
    );
  }
}

export = WordPress;
