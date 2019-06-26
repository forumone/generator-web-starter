import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import createPHPDockerfile from '../../../createPHPDockerfile';
import getLatestDrupalTag from '../../../registry/getLatestDrupalTag';
import getLatestPhpCliAlpineTag from '../../../registry/getLatestPhpCliAlpineTag';
import spawnComposer from '../../../spawnComposer';
import { enableXdebug, xdebugEnvironment } from '../../../xdebug';

import installDrupal, {
  drupalProject,
  pantheonProject,
  Project,
} from './installDrupal';

const gessoDrupalDependencies: ReadonlyArray<string> = [
  'drupal/components',
  'drupal/twig_field_value',
  'drupal/twig_tweak',
];

class Drupal8 extends Generator {
  // Assigned to in initializing phase
  private latestDrupalTag!: string;
  private latestPhpTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;
  private projectType!: Project;
  private useGesso: boolean | undefined;

  private shouldInstall: boolean | undefined = false;

  async initializing() {
    const [latestDrupalTag, latestPhpTag] = await Promise.all([
      getLatestDrupalTag(8),
      getLatestPhpCliAlpineTag(),
    ]);

    this.latestDrupalTag = latestDrupalTag;
    this.latestPhpTag = latestPhpTag;
  }

  async prompting() {
    const {
      documentRoot,
      useCapistrano,
      useGesso,
      shouldInstallDrupal,
      drupalProjectType,
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
        message: 'Install Drupal 8?',
        default: (answers: { documentRoot: string }) => {
          const targetPath = this.destinationPath(
            'services/drupal',
            answers.documentRoot,
          );

          return !this.fs.exists(targetPath);
        },
        when: !this.options.skipInstall,
      },
      {
        type: 'list',
        name: 'drupalProjectType',
        message: 'Select project type to install:',
        // NB. `as' casts below needed to dodge a deficiency in the Inquirer types
        // (they don't know about the 'choice' property)
        choices: [
          {
            name: `Drupal Project (${drupalProject})`,
            value: drupalProject,
            short: 'Drupal Project',
          } as { name: string; value: string },
          {
            name: `Pantheon (${pantheonProject})`,
            value: pantheonProject,
            short: 'Pantheon',
          } as { name: string; value: string },
        ],
        when: answers => answers.shouldInstallDrupal,
      },
    ]);

    this.documentRoot = documentRoot;
    this.shouldInstall = shouldInstallDrupal;
    this.projectType = drupalProjectType;
    this.useGesso = useGesso;

    if (useCapistrano) {
      this.composeWith(this.options.capistrano, {
        platform: 'drupal8',
        name: this.options.name,
        webroot: documentRoot,
        appWebroot: posix.join('services/drupal', documentRoot),
        config: {
          drupal_features: false,
        },
        linkedDirectories: ['services/drupal/sites/default/files'],
        linkedFiles: ['services/drupal/.env'],
      });
    }

    if (useGesso) {
      this.composeWith(require.resolve('../../gesso/GessoDrupal8'), {
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

    const hostDrupalPath =
      './' + posix.join('services/drupal', this.documentRoot);

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
      'exec php-fpm',
    ].join('\n');

    editor.addService('drupal', {
      build: './services/drupal',
      command: ['sh', '-c', drupalEntryCommand],
      depends_on: ['mysql'],
      environment: {
        SMTPHOST: 'mailhog:1025',
        ...xdebugEnvironment,
      },
      volumes: [
        createBindMount('./services/drupal', '/var/www/html'),
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
      entrypoint: ['/var/www/html/vendor/bin/drush', `--root=${varHtmlPath}`],
      volumes: [
        createBindMount('./services/drupal', '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolumeName,
          target: uploadPath,
        },
      ],
    });

    cliEditor.addComposer('services/drupal');
  }

  private async _installDrupal() {
    if (!this.shouldInstall) {
      return;
    }

    await installDrupal({
      documentRoot: this.documentRoot,
      projectType: this.projectType,
      serviceDirectory: this.destinationPath('services'),
    });
  }

  private async _installGessoDependencies() {
    if (!this.shouldInstall) {
      return;
    }

    // Install required dependencies to avoid Gesso crashing when enabled
    for (const dependency of gessoDrupalDependencies) {
      await spawnComposer(['require', dependency, '--ignore-platform-reqs'], {
        cwd: this.destinationPath('services/drupal'),
      });
    }
  }

  // We have to run the drupal installation here because drupal-scaffold will fail if the target
  // directory (services/drupal) exists and is not empty.
  // This means that we can't run when the Dockerfile is written out by the generator during the
  // writing phase, despite the `installing' phase being the more natural choice.
  async default() {
    await this._installDrupal();

    if (this.useGesso) {
      await this._installGessoDependencies();
    }
  }

  writing() {
    const needsMemcached = this.options.plugins.cache === 'Memcache';
    const sharedDependencies = needsMemcached
      ? ['libmemcached-dev', 'zlib-dev', 'libevent-dev']
      : [];

    const sharedPeclPackages = needsMemcached ? ['memcached'] : [];

    const drupalDockerfile = createPHPDockerfile({
      from: { image: 'drupal', tag: this.latestDrupalTag },
      buildDeps: sharedDependencies,
      peclPackages: sharedPeclPackages,
      xdebug: true,
    });

    // "borrowed" from library/drupal's Dockerfile
    const drupalDependencies = [
      'coreutils',
      'freetype-dev',
      'libjpeg-turbo-dev',
      'postgresql-dev',
      'libzip-dev',
    ];

    const drushDockerfile = createPHPDockerfile({
      from: { image: 'php', tag: this.latestPhpTag },
      buildDeps: [...drupalDependencies, ...sharedDependencies],
      builtins: ['gd', 'opcache', 'pdo_mysql', 'pdo_pgsql', 'zip'],
      configureArgs: [
        [
          'gd',
          '--with-freetype-dir=/usr/include/',
          '--with-jpeg-dir=/usr/include/',
          '--with-png-dir=/usr/include/',
        ],
      ],
      peclPackages: sharedPeclPackages,
      runtimeDeps: ['mysql-client', 'openssh', 'rsync'],
    });

    this.fs.write(
      this.destinationPath('services/drupal/Dockerfile'),
      drupalDockerfile.render(),
    );

    this.fs.write(
      this.destinationPath('services/drush/Dockerfile'),
      drushDockerfile.render(),
    );

    // We don't use the filesystem when building the Drupal image, and this avoids a great deal of
    // I/O between the Docker client and daemon.
    const drupalDockerIgnore = new IgnoreEditor();
    drupalDockerIgnore.addEntry('*');

    this.fs.write(
      this.destinationPath('services/drupal/.dockerignore'),
      drupalDockerIgnore.serialize(),
    );

    this.fs.copy(
      this.templatePath('_env'),
      this.destinationPath('services/drupal/.env'),
    );
  }
}

export = Drupal8;
