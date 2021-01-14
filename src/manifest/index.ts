import Generator from 'yeoman-generator';
import Repository from './resource/Repository';
import Environment from './resource/Environment';
import Deployment from './deployment';
import { ManifestDefinition } from './types';
import YAML from 'yaml';

const cmsPlugins = ['Drupal7', 'Drupal8', 'WordPress'];
const platform = ['Docker', 'JavaScript'];
const manifestVersion = 'v1';

type ManifestGeneratorCollection = {
  repository: Repository;
  environment: Environment;
  deployment: Deployment;
};

class Manifest extends Generator {
  private answers: Generator.Answers = {};
  private generators!: ManifestGeneratorCollection;
  private manifest!: Partial<ManifestDefinition>;

  /**
   * Execute initialization for this generator and trigger subgenerators.
   */
  async initializing() {
    this.answers = this.config.get('promptAnswers');

    // Assert the assignment as a complete object to circumvent type errors below
    // until the remaining generators are available for assignment as well.
    this.generators = {} as ManifestGeneratorCollection;

    this.debug('Composing with Repository generator.');
    this.generators.repository = this.composeWith(
      require.resolve('./resource/Repository'),
      {},
      true,
    ) as Repository;

    this.debug('Composing with Environment generator.');
    this.generators.environment = this.composeWith(
      require.resolve('./resource/Environment'),
      {},
      true,
    ) as Environment;

    // Queue a task to synchronize defined resources after the prompting phase of the
    // resource generators before the remaining generators begin their prompting phases.
    // Use the closure created below to access the generator collection for the assignments
    // between generator instances.
    this.queueTask({
      taskName: 'propagateResources',
      queueName: 'prompting',
      method: () => {
        this.debug('Running propagateResources task.');

        // Pull resources from resource generators for propogation to remaining
        // generators dependent on them.
        const resources = {
          repositories: this.generators.repository._getCollection(),
          environments: this.generators.environment._getCollection(),
        };

        this.generators.deployment._setResources(resources);
      },
    });

    // Create the additional generators after the syncing task is queued to ensure
    // the resources have been synced already.
    this.debug('Composing with Deployment generator.');
    this.generators.deployment = this.composeWith(
      require.resolve('./deployment'),
      {},
      true,
    ) as Deployment;
  }

  /**
   * Execute the configuration phase of this generator.
   */
  async prompting() {
    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is the name of the project?',
        store: true,
      },
      {
        type: 'input',
        name: 'projectCode',
        message: 'What is the project code for the project?',
        store: true,
      },
      {
        type: 'list',
        name: 'cms',
        choices: [...cmsPlugins, 'None'],
        message: 'Which CMS will this project use?',
        store: true,
      },
      {
        type: 'list',
        name: 'platform',
        choices: [...platform, 'Other'],
        message: 'Which local platform will this project use?',
        store: true,
      },
      {
        type: 'input',
        name: 'documentRoot',
        message: 'What is the name of the document root?',
        default: 'public',
        store: true,
      },
    ]);
  }

  /**
   * Execute the configuration phase of this generator.
   */
  configuring() {
    this.debug({
      generator: 'Manifest',
      answers: this.answers,
    });

    const manifest: Partial<ManifestDefinition> = {
      version: manifestVersion,
      ...this.config.get('promptValues'),
    };

    // Delegate completion of manifest sections into subgenerators.
    this._propagateManifestDefinition(manifest);

    this.manifest = manifest as ManifestDefinition;
  }

  /**
   * Push the manifest into all generators for delegated definition of values.
   */
  _propagateManifestDefinition(manifest: Partial<ManifestDefinition>) {
    for (const generator of Object.values(this.generators)) {
      generator._setManifest(manifest);
    }
  }

  /**
   * Execute the writing phase of this generator.
   */
  writing() {
    // Write all manifest content to a YAML file.
    const manifestPath = this.destinationPath('.f1-manifest.yml');
    this.fs.write(manifestPath, YAML.stringify(this.manifest));
  }
}

export = Manifest;
