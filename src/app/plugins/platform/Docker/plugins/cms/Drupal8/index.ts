import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';
import dedent from 'dedent';
import { promisify } from 'util';
import fs from 'fs';

import IgnoreEditor from '../../../../../../IgnoreEditor';
import ComposeEditor, { createBindMount } from '../../../ComposeEditor';
import getLatestDrupal8Tag from '../../../registry/getLatestDrupal8Tag';
import getLatestDrupal8CliTag from '../../../registry/getLatestDrupal8CliTag';
import spawnComposer from '../../../spawnComposer';
import {
  enableXdebug,
  enableXdebugProfiler,
  xdebugEnvironment,
} from '../../../xdebug';
import createDrupalDockerfile from './createDrupalDockerfile';
import createDrushDockerfile from './createDrushDockerfile';
import { gessoDrupalPath } from '../../gesso/constants';
import { injectPlatformConfig, renameWebRoot } from './installUtils';
import {
  outputFormat as format,
  promptOrUninteractive,
} from '../../../../../../../util';
const mkdir = promisify(fs.mkdir);

const drupalProject = 'drupal-composer/drupal-project:8.x-dev';
type DrupalProject = typeof drupalProject;

const pantheonProject = 'pantheon-systems/example-drops-8-composer';
type PantheonProject = typeof pantheonProject;

type Project = PantheonProject | DrupalProject;

const gessoDrupalDependencies: ReadonlyArray<string> = [
  'drupal/components',
  'drupal/twig_field_value',
  'drupal/twig_tweak:^2.9',
];

const configGitKeepContents = dedent`
  This file is used for your Drupal 8 configuration.
`;

class Drupal8 extends Generator {
  // Assigned to in initializing phase
  private latestDrupalTag!: string;
  private latestDrushTag!: string;

  // Assigned to in prompting phase
  private documentRoot!: string;
  private projectType!: Project;
  private useGesso: boolean | undefined;

  private shouldInstall: boolean | undefined = false;

  private spawnComposer: typeof spawnComposer = spawnComposer.bind(this);

  public async initializing(): Promise<void> {
    const [latestDrupalTag, latestDrushTag] = await Promise.all([
      getLatestDrupal8Tag(),
      getLatestDrupal8CliTag(),
    ]);
    this.debug(
      format.debug('Loaded latest Drupal (%s) and Drush (%s) tags.'),
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
    } = await promptOrUninteractive.call(this, [
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
        message: 'Install Drupal 8?',
        store: true,
        default: (answers: { documentRoot: string }) => {
          const targetPath = this.destinationPath(
            'services/drupal',
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
      const capistranoOptions = {
        platform: 'drupal8',
        name: this.options.name,
        webroot: documentRoot,
        appWebroot: posix.join('services/drupal', documentRoot),
        config: {
          drupal_features: false,
        },
        linkedDirectories: [
          posix.join('services/drupal', documentRoot, 'sites/default/files'),
        ],
        linkedFiles: ['services/drupal/.env'],
        uninteractive: this.options.uninteractive,
      };
      this.debug(
        format.info('Composing with Capistrano generator using options: %O'),
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
        format.debug('Composing with Gesso generator using options: %O'),
        gessoOptions,
      );
      this.composeWith(
        require.resolve('../../gesso/GessoDrupal8'),
        gessoOptions,
      );
    }
  }

  public configuring(): void {
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
      'services/drupal',
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

    editor.addService('drupal', {
      build: { context: './services/drupal', target: 'dev' },
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
      entrypoint: ['/var/www/html/vendor/bin/drush'],
      working_dir: varHtmlPath,
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

  /**
   * Complete scaffolding and customization steps for the Drupal service directory.
   */
  private async _scaffoldDrupal(): Promise<void> {
    if (!this.shouldInstall) {
      return;
    }

    // Create the service directory if it doesn't exist.
    // If the services directory doesn't exist, Docker fails since it can't mount
    // it as a volume mount.
    if (!this.existsDestination('services')) {
      this.debug(
        format.info('Creating services directory at %s.'),
        this.destinationPath('services'),
      );
      try {
        await mkdir(this.destinationPath('services'), { recursive: true });
      } catch (err) {
        this.log(
          format.error('Failed to create services directory at %s.'),
          this.destinationPath('services'),
        );
        if (this.options.debug) {
          // Show the contents of the directory for debugging.
          // @todo Output the content of this with more debugging message context
          //   around it.
          this.spawnCommandSync('ls', ['-al']);
        }
        this.env.error(err);
      }
    }

    // Check if the special web root renaming will be required.
    // This will throw an error if this will cause incompatibilities.
    const needsDocRootRename = this._needsDocRootRename();

    const drupalRoot = this.destinationPath('services/drupal');

    this.debug(format.info('Triggering Drupal project scaffolding.'));
    await this.spawnComposer(
      [
        'create-project',
        this.projectType,
        'drupal',
        '--stability',
        'dev',
        '--no-interaction',
        '--ignore-platform-reqs',
        '--no-install',
      ],
      {
        cwd: this.destinationPath('services'),
      },
    ).catch(() =>
      this.env.error(
        new Error(
          format.error.bold('Composer `create-project` command failed.'),
        ),
      ),
    );

    // The project scaffolding tools assume the web root should be named `web`,
    // so various references need to be replaced with the designated rename if
    // this is not the name selected for the project.
    if (needsDocRootRename) {
      this.debug('Replacing docroot references in generated files.');
      await renameWebRoot(this.documentRoot, drupalRoot);
    }

    // Inject platform configuration to the generated composer.json file.
    this.debug(
      format.info('Injecting platform configuration into composer.json.'),
    );
    await injectPlatformConfig(`${drupalRoot}/composer.json`);
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
    if (this.projectType === pantheonProject && needsRename) {
      throw new Error(
        `Pantheon projects do not support '${this.documentRoot}' as the document root.`,
      );
    }

    return needsRename;
  }

  /**
   * Install additional dependencies to support Gesso.
   */
  private async _installGessoDependencies(): Promise<void> {
    if (!this.shouldInstall) {
      return;
    }

    // Install required dependencies to avoid Gesso crashing when enabled
    this.debug(
      format.info('Adding Gesso Composer dependencies: %s'),
      gessoDrupalDependencies.join(', '),
    );
    await this.spawnComposer(
      [
        'require',
        ...gessoDrupalDependencies,
        '--ignore-platform-reqs',
        '--no-scripts',
        '--no-install',
      ],
      {
        cwd: this.destinationPath('services/drupal'),
      },
    ).catch(() => {
      this.env.error(
        new Error(
          format.error.bold(
            'Composer installation of Gesso dependencies failed.',
          ),
        ),
      );
    });
  }

  // We have to run the drupal installation here because drupal-scaffold will fail if the target
  // directory (services/drupal) exists and is not empty.
  // This means that we can't run when the Dockerfile is written out by the generator during the
  // writing phase, despite the `installing' phase being the more natural choice.
  async default(): Promise<void> {
    await this._scaffoldDrupal();

    if (this.useGesso) {
      this.debug(format.info('Installing Gesso dependencies.'));
      await this._installGessoDependencies();
    }
  }

  public writing(): void {
    const needsMemcached = this.options.plugins.cache === 'Memcache';

    // The Pantheon template doesn't create a load.environment.php file, so we have to
    // account for that lest the Docker build fail (or worse, we remove the ability to load
    // env vars when using drupal-composer).
    const sourceFiles =
      this.projectType === drupalProject ? ['load.environment.php'] : [];

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
      format.debug('Writing Drupal Dockerfile to %s.'),
      'services/drupal/Dockerfile',
    );
    this.fs.write(
      this.destinationPath('services/drupal/Dockerfile'),
      drupalDockerfile.render(),
    );

    this.debug(
      format.debug('Writing Drush Dockerfile to %s.'),
      'services/drush/Dockerfile',
    );
    this.fs.write(
      this.destinationPath('services/drush/Dockerfile'),
      drushDockerfile.render(),
    );

    this._writeDockerIgnore();

    this.debug(
      format.debug('Copying .env template file to %s.'),
      'services/drupal/.env',
    );
    this.fs.copy(
      this.templatePath('_env'),
      this.destinationPath('services/drupal/.env'),
    );

    this.debug(
      format.debug('Writing .gitkeep file to %s.'),
      'services/drupal/config/.gitkeep',
    );
    this.fs.write(
      this.destinationPath('services/drupal/config/.gitkeep'),
      configGitKeepContents,
    );
  }

  public async install(): Promise<void> {
    if (this.options.skipInstall) {
      this.debug(
        format.info(
          'Skipping final Composer installation due to `--skip-install` option.',
        ),
      );
      return;
    }

    // Run final installation of all Composer dependencies now that all
    // requirements have been assembled.
    this.debug(format.info('Running final Composer installation.'));
    await this.spawnComposer(['install', '--ignore-platform-reqs'], {
      cwd: this.destinationPath('services/drupal'),
    }).catch(() => {
      this.env.error(
        new Error(
          format.error.bold(
            'Final installation of Composer dependencies failed.',
          ),
        ),
      );
    });
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
    const drupalDockerIgnore = new IgnoreEditor();

    // Bubble up Gesso dockerignore rules.
    if (this.useGesso) {
      if (
        this.existsDestination(`services/drupal/${gessoDrupalPath}/.gitignore`)
      ) {
        this.debug(
          format.debug('Adding contents of %s to the .dockerignore file.'),
          `services/drupal/${gessoDrupalPath}/.gitignore`,
        );
        drupalDockerIgnore.addContentsOfFile({
          content: this.readDestination(
            `services/drupal/${gessoDrupalPath}/.gitignore`,
          ),
          heading: 'Gesso Assets',
          path: gessoDrupalPath,
        });
      } else {
        this.log(
          format.warning(
            'Gesso was selected for use, but the .gitignore file at %s could not be found. There may be an error.',
          ),
          `services/drupal/${gessoDrupalPath}/.gitignore`,
        );
      }
    }

    // Incorporate gitignore rules.
    if (this.existsDestination('services/drupal/.gitignore')) {
      this.debug(
        format.debug('Adding contents of %s to the .dockerignore file.'),
        'services/drupal/.gitignore',
      );
      drupalDockerIgnore.addContentsOfFile({
        content: this.readDestination('services/drupal/.gitignore'),
        heading: 'Drupal',
        path: '/',
      });
    }

    // Add Web Starter custom rules.
    // Serialize the drupalDockerIgnore content for inclusion into the
    // template being rendered since template content cannot be rendered
    // to a string and appended using the IgnoreEditor solution.
    this.debug(
      format.debug('Rendering .dockerignore template to %s.'),
      'services/drupal/.dockerignore',
    );
    this.renderTemplate(
      this.templatePath('_dockerignore.ejs'),
      this.destinationPath('services/drupal/.dockerignore'),
      {
        documentRoot: this.documentRoot,
        inheritedRules: drupalDockerIgnore.serialize(),
      },
    );
  }
}

export = Drupal8;
