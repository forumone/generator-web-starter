import assert from 'assert-plus';
import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

import ComposeEditor, {
  createBindMount,
  ServiceMutator,
} from '../../ComposeEditor';
import VolumeMount from '../../ComposeEditor/VolumeMount';
import installGesso, { InstallGessoOptions } from '../../installGesso';

type BranchSpecifier = Pick<InstallGessoOptions, 'branch' | 'repository'>;

interface CreateGeneratorOptions {
  /**
   * The repository and branch name used for downloading Gesso from GitHub.
   */
  git: BranchSpecifier;

  /**
   * Install phase to use.
   *
   * The `'default'` value is needed due to the Drupal8 generator - see comments there for
   * more information.
   */
  installPhase: 'install' | 'default';

  /**
   * The name of the service this is being integrated with. Corresponds to the service
   * name output in the Docker Compose files.
   */
  serviceName: string;

  /**
   * How to get to the theme from within the service document root. In WordPress, for
   * example, this is the string `'wp-content/themes'`.
   */
  themeDirectory: string;
}

/**
 * Creates a Yeoman `Generator` subclass that installs Gesso for a specific CMS. The
 * parameters represent the various idiosyncracies - how to get to the theme, which Git
 * branch to download, etc. - that vary between systems.
 */
function createGessoGenerator({
  git,
  installPhase,
  serviceName,
  themeDirectory,
}: CreateGeneratorOptions): typeof Generator {
  class Gesso extends Generator {
    // Assigned to in initializing phase
    private documentRoot!: string;

    // Assigned to in prompting phase
    private themeName!: string;

    private shouldInstall: boolean | undefined = false;

    private _getTargetThemePath(name = this.themeName) {
      return this.destinationPath(
        'services',
        serviceName,
        this.documentRoot,
        themeDirectory,
        name,
      );
    }

    async initializing() {
      const options = this.options;
      assert.string(options.documentRoot, 'options.documentRoot');
      assert.object(options.composeEditor, 'options.composeEditor');
      assert.object(options.composeCliEditor, 'options.composeCliEditor');

      this.documentRoot = options.documentRoot;
    }

    async prompting() {
      const { gessoThemeName, gessoShouldInstall } = await this.prompt([
        {
          type: 'input',
          name: 'gessoThemeName',
          validate: name => name !== '' && validFilename(name),
          message: 'What is the theme name?',
          default: 'gesso',
          store: true,
        },
        {
          type: 'confirm',
          name: 'gessoShouldInstall',
          message: 'Install Gesso?',
          // Default to true if the theme isn't already installed
          default: (answers: { gessoThemeName: string }) => {
            return !this.fs.exists(
              this._getTargetThemePath(answers.gessoThemeName),
            );
          },
          when: !this.options.skipInstall,
        },
      ]);

      this.shouldInstall = gessoShouldInstall;
      this.themeName = gessoThemeName;
    }

    configuring() {
      // Get mount locations for the Gesso data volumes
      const root = posix.join(
        '/var/www/html',
        this.documentRoot,
        themeDirectory,
        this.themeName,
      );

      const patternLabPath = posix.join(root, 'pattern-lab');
      const cssPath = posix.join(root, 'css');

      const editor = this.options.composeEditor as ComposeEditor;

      const publicVolumeName = editor.ensureVolume('gesso-patternlab');
      const cssVolumeName = editor.ensureVolume('gesso-css');

      const gessoVolumes: VolumeMount[] = [
        {
          type: 'volume',
          source: publicVolumeName,
          target: patternLabPath,
        },
        {
          type: 'volume',
          source: cssVolumeName,
          target: cssPath,
        },
      ];

      // For both the CMS and server, mount Gesso data volumes
      const addGessoVolumes: ServiceMutator = service => {
        const { volumes = [] } = service;

        return {
          ...service,
          volumes: [...volumes, ...gessoVolumes],
        };
      };

      editor.modifyService(serviceName, addGessoVolumes);
      editor.modifyService('nginx', addGessoVolumes);

      const cliEditor = this.options.composeCliEditor as ComposeEditor;

      // NB. posix.join() doesn't add the ./ we need to help Compose distinguish between
      // bind mounts and volumes, so we have to add it manually here. (It's the same
      // reason we use string concatenation later on in this file when creating a handful
      // of bind mounts relative to this directory.)
      const hostThemePath = `./${posix.join(
        'services',
        serviceName,
        this.documentRoot,
        themeDirectory,
        this.themeName,
      )}`;

      // Add the Gesso container here
      cliEditor.addService('gesso', {
        build: hostThemePath,
        init: true,
        volumes: [
          createBindMount(`${hostThemePath}/images`, '/app/images'),
          createBindMount(`${hostThemePath}/js`, '/app/js'),
          createBindMount(`${hostThemePath}/source`, '/app/source'),
          {
            type: 'volume',
            source: publicVolumeName,
            target: '/app/pattern-lab',
          },
          {
            type: 'volume',
            source: cssVolumeName,
            target: '/app/css',
          },
        ],
      });
    }

    private async _installGesso() {
      if (!this.shouldInstall) {
        return;
      }

      await installGesso({ ...git, targetPath: this._getTargetThemePath() });
    }

    async default() {
      if (installPhase === 'default') {
        return this._installGesso();
      }
    }

    async install() {
      if (installPhase === 'install') {
        return this._installGesso();
      }
    }
  }

  return Gesso;
}

export default createGessoGenerator;
