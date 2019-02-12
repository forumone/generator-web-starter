import dedent from 'dedent';
import fs from 'fs';
import makeDir from 'make-dir';
import path, { posix } from 'path';
import { promisify } from 'util';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import createGessoDockerfile from '../../../createGessoDockerfile';
import createPHPDockerfile from '../../../createPHPDockerfile';
import installGesso from '../../../installGesso';
import getLatestDrupalTag from '../../../registry/getLatestDrupalTag';
import getLatestNodeTag from '../../../registry/getLatestNodeTag';
import getLatestPhpCliTag from '../../../registry/getLatestPhpCliTag';
import spawnComposer from '../../../spawnComposer';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function replaceIn(
  path: string,
  search: string | RegExp,
  replacement: string,
): Promise<void> {
  const contents = await readFile(path, 'utf-8');
  return writeFile(path, contents.replace(search, replacement));
}

class Drupal8 extends Generator {
  // Assigned to in initializing phase
  private latestDrupalTag!: string;
  private latestNodeTag!: string;
  private latestPhpTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;
  private themeName!: string;

  private shouldInstallDrupal: boolean | undefined = false;
  private shouldInstallGesso: boolean | undefined = false;

  async initializing() {
    const [latestDrupalTag, latestPhpTag, latestNodeTag] = await Promise.all([
      getLatestDrupalTag(8),
      getLatestPhpCliTag(),
      getLatestNodeTag(),
    ]);

    this.latestDrupalTag = latestDrupalTag;
    this.latestNodeTag = latestNodeTag;
    this.latestPhpTag = latestPhpTag;
  }

  async prompting() {
    const {
      documentRoot,
      drupalThemeName,
      shouldInstallDrupal,
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
        name: 'drupalThemeName',
        validate: name => name !== '' && validFilename(name),
        message: 'What is the theme name?',
        default: 'gesso',
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
        default: false,
        when: !this.options.skipInstall,
      },
      {
        type: 'confirm',
        name: 'shouldInstallGesso',
        message: 'Install Gesso?',
        default: false,
        when: answers => answers.shouldInstallDrupal,
      },
    ]);

    this.documentRoot = documentRoot;
    this.themeName = drupalThemeName;
    this.shouldInstallDrupal = shouldInstallDrupal;
    this.shouldInstallGesso = shouldInstallGesso;

    if (useCapistrano) {
      this.composeWith(this.options.capistrano, {
        platform: 'drupal8',
        name: this.options.name,
        webroot: documentRoot,
        appWebroot: posix.join('services/drupal', documentRoot),
        config: {},
        linkedDirectories: ['sites/default/files'],
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

    // Various important Gesso-related paths
    const themePath = posix.join(varHtmlPath, 'themes', this.themeName);
    const patternLabPublicPath = posix.join(themePath, 'pattern-lab/public');
    const gessoCssPath = posix.join(themePath, 'css');

    const editor = this.options.composeEditor as ComposeEditor;

    // Volumes needed by Drupal and Gesso.
    // * fs-data: sites/default/files
    //   Needed so that we can persist saved files across containers.
    // * gesso-public: <theme>/pattern-lab/public
    //   Needed to share the PL output with nginx, Drupal, and the PL builder
    // * gesso-css: <theme>/css
    //   Needed to share the compiled sass with nginx, Drupal, and the Gesso container
    const filesystemVolume = editor.ensureVolume('fs-data');
    const gessoPublicVolume = editor.ensureVolume('gesso-public');
    const gessoCssVolume = editor.ensureVolume('gesso-css');

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

    editor.addService('drupal', {
      build: './services/drupal',
      command: [
        'sh',
        '-c',
        dedent`
          chmod -R 0777 ${uploadPath}
          exec php-fpm
        `,
      ],
      depends_on: ['mysql'],
      environment: {
        SMTPHOST: 'mailhog:1025',
        // This is a shell substitution being used in Docker Compose, not a false negative being
        // flagged by TSLint.
        // tslint:disable-next-line:no-invalid-template-strings
        XDEBUG_CONFIG: 'remote_host=${F1_XDEBUG_REMOTE:-127.0.0.1}',
      },
      volumes: [
        createBindMount('./services/drupal', '/var/www/html'),
        {
          type: 'volume',
          source: filesystemVolume,
          target: uploadPath,
        },
        {
          type: 'volume',
          source: gessoPublicVolume,
          target: patternLabPublicPath,
        },
        {
          type: 'volume',
          source: gessoCssVolume,
          target: gessoCssPath,
        },
      ],
    });

    editor.addMysqlService();
    editor.addMailhogService();

    const cliEditor = this.options.composeCliEditor as ComposeEditor;

    // Gesso + PL building

    // NB. posix.join() doesn't add the ./ we need to help Compose distinguish between bind mounts
    // and volumes, so we have to add it manually here. (It's the same reason we use string
    // concatenation later on in this file when creating a handful of bind mounts relative to this
    // directory.)
    const hostThemePath =
      './' +
      posix.join(
        'services/drupal',
        this.documentRoot,
        'themes',
        this.themeName,
      );

    // Node container for sass...
    cliEditor.addService('gesso', {
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
    cliEditor.addService('pattern-lab', {
      image: 'php:' + this.latestPhpTag,
      command: [
        'php',
        '-dmemory_limit=-1',
        'core/console',
        '--watch',
        '--no-procs',
      ],
      init: true,
      restart: 'always',
      volumes: [
        createBindMount(hostThemePath + '/pattern-lab', '/app'),
        {
          type: 'volume',
          source: gessoPublicVolume,
          target: '/app/public',
        },
      ],
      working_dir: '/app',
    });

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
          source: filesystemVolume,
          target: uploadPath,
        },
      ],
    });

    cliEditor.addComposer('services/drupal');
  }

  private async _installDrupal() {
    if (!this.shouldInstallDrupal) {
      return;
    }

    const drupalRoot = this.destinationPath('services/drupal');

    await makeDir(drupalRoot);

    await spawnComposer(
      [
        'create-project',
        'drupal-composer/drupal-project:8.x-dev',
        'drupal',
        '--stability',
        'dev',
        '--no-interaction',
        '--no-install',
      ],
      { cwd: path.dirname(drupalRoot) },
    );

    const documentRoot = this.documentRoot;
    if (documentRoot !== 'web') {
      await Promise.all([
        replaceIn(
          path.join(drupalRoot, 'composer.json'),
          /web\//g,
          documentRoot + '/',
        ),
        replaceIn(
          path.join(drupalRoot, '.gitignore'),
          /web\//g,
          documentRoot + '/',
        ),
        replaceIn(
          path.join(drupalRoot, 'scripts/composer/ScriptHandler.php'),
          /\/web/g,
          '/' + documentRoot,
        ),
        replaceIn(path.join(drupalRoot, 'README.md'), /web/g, documentRoot),
      ]);
    }

    await spawnComposer(['update', '--ignore-platform-reqs'], {
      cwd: drupalRoot,
    });

    // The composer entrypoint doesn't know about the drupal-scaffold command, so we
    // have to manually specify 'drupal-scaffold' or else it'll try to look it up in
    // $PATH, which fails.
    await spawnComposer(['composer', 'drupal:scaffold'], { cwd: drupalRoot });
  }

  private async _installGesso() {
    if (!this.shouldInstallGesso) {
      return;
    }

    const themePath = this.destinationPath(
      'services/drupal',
      this.documentRoot,
      'themes',
      this.themeName,
    );

    await installGesso({
      branch: '8.x-2.x',
      repository: 'gesso',
      targetPath: themePath,
    });

    // Install required dependencies to avoid Gesso crashing when enabled
    for (const dependency of ['components', 'twig_field_value']) {
      await spawnComposer(
        ['require', `drupal/${dependency}`, '--ignore-platform-reqs'],
        { cwd: this.destinationPath('services/drupal') },
      );
    }
  }

  // We have to run the drupal installation here because drupal-scaffold will fail if the target
  // directory (services/drupal) exists and is not empty.
  // This means that we can't run when the Dockerfile is written out by the generator during the
  // writing phase, despite the `installing' phase being the more natural choice.
  async default() {
    await this._installDrupal();
    await this._installGesso();
  }

  writing() {
    this.fs.write(
      this.destinationPath('services/gesso/Dockerfile'),
      createGessoDockerfile(this.latestNodeTag).render(),
    );

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

    const gessoDockerIgnore = new IgnoreEditor();
    gessoDockerIgnore.addEntry('*');
    gessoDockerIgnore.addEntry('!tasks');
    gessoDockerIgnore.addEntry('!Gruntfile.js');
    gessoDockerIgnore.addEntry('!package.json');
    gessoDockerIgnore.addEntry('!package-lock.json');

    this.fs.write(
      this.destinationPath(
        'services/drupal/themes',
        this.themeName,
        '.dockerignore',
      ),
      gessoDockerIgnore.serialize(),
    );
  }
}

export = Drupal8;
