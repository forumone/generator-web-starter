import { ManifestInquirer } from '../../ambient';
import {
  ManifestDefinition,
  ResourceCollection,
  SubGenerator,
} from '../../types';
import { EnvironmentCollection, EnvironmentDefinition } from './types';

type EnvironmentConfigurationEntry = ManifestInquirer.ConfigurationListEntry<
  EnvironmentDefinition
>;
type EditAnotherEnvironmentQuestionSet = ManifestInquirer.EditAnotherQuestionSet<
  EnvironmentDefinition
>;

const environments = ['Forum One', 'Pantheon', 'Acquia', 'WPEngine'];

class Environment extends SubGenerator {
  private environments: EnvironmentCollection = {};
  private manifest!: Partial<ManifestDefinition>;

  /**
   * Execute initialization for this generator.
   *
   * @memberof Environment
   */
  async initializing() {
    const config = this.config.getAll();

    this.environments = config.environments || {};
  }

  /**
   * @inheritdoc
   */
  public _getResources(): Record<string, ResourceCollection> {
    return {
      environments: this.environments,
    };
  }

  /**
   * @inheritdoc
   */
  public _setResources(resources: Record<string, ResourceCollection>): void {
    this.environments = resources.environments as EnvironmentCollection;
  }

  /**
   * @inheritdoc
   */
  public _setManifest(manifest: Partial<ManifestDefinition>) {
    this.manifest = manifest;
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Environment
   */
  async prompting() {
    this.environments = await this._promptForEnvironments();
  }

  /**
   * Loop to enable updates and creation of new environments.
   *
   * @returns {Promise<EnvironmentCollection>}
   * @memberof Environment
   */
  async _promptForEnvironments(): Promise<EnvironmentCollection> {
    let another = true;
    while (another === true) {
      // Select an entry to edit or create a new one.
      const { edit } = await this.prompt([
        {
          type: 'list',
          name: 'edit',
          message: 'Would you like to update your hosting environments?',
          choices: [...Object.keys(this.environments), 'Add new', 'No'],
        },
      ]);

      let environmentConfig;
      if (edit === 'No') {
        another = false;
      } else {
        if (edit === 'Add new') {
          environmentConfig = undefined;
        } else {
          environmentConfig = this.environments[edit];
        }

        // Prompt for the configuration changes with the existing config if available.
        const itemConfigAnswers = await this._promptForHostingEnvironmentConfiguration(
          environmentConfig,
        );

        // Save the configuration and check whether to continue the loop.
        this.environments[itemConfigAnswers.item.id] = itemConfigAnswers.item;
        another = itemConfigAnswers.another;
      }
    }

    return this.environments;
  }

  /**
   * Prompt for the specifics of a given hosting environment.
   *
   * @param {Partial<EnvironmentDefinition>} [environment={}]
   * @returns {Promise<EnvironmentConfigurationEntry>}
   * @memberof Environment
   */
  async _promptForHostingEnvironmentConfiguration(
    environment: Partial<EnvironmentDefinition> = {},
  ): Promise<EnvironmentConfigurationEntry> {
    const environmentQuestions: EditAnotherEnvironmentQuestionSet = [
      {
        type: 'input',
        name: 'id',
        message:
          'What should this environment be referenced as? (Example: dev, stage, production)',
        default: environment.id || 'dev',
      },
      {
        type: 'list',
        name: 'type',
        message: 'What type of hosting is used for this environment?',
        choices: [...environments, 'Other'],
        default: environment.type || 'Forum One',
      },
      {
        type: 'input',
        name: 'url',
        message: 'What URL is used to access this environment?',
        default: environment.url,
      },
      {
        type: 'input',
        name: 'branch',
        message: 'What branch should be deployed to this environment?',
        default: environment.branch,
      },
      // @todo: Add subdirectory suggestions based on the known CMS type.
      {
        type: 'input',
        name: 'sourceSubdirectory',
        message:
          'What path within the source repository should be deployed to this environment?',
        default: environment.sourceSubdirectory,
      },
      {
        type: 'input',
        name: 'login',
        message: 'What is the login user for this environment?',
        default: environment.login,
        when: answers => answers.type === 'Forum One',
      },
      {
        type: 'input',
        name: 'deployPath',
        message: 'What file path should the application deploy to?',
        default: environment.deployPath,
        when: answers => answers.type === 'Forum One',
      },
      {
        type: 'confirm',
        name: 'another',
        message: 'Would you like to add another environment?',
        default: false,
      },
    ];

    const answers = await this.prompt(environmentQuestions);

    // Spread to capture all properties automatically regardless of questions prompted.
    const { another, ...environmentDefinition } = answers;

    return {
      another,
      item: environmentDefinition,
    };
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Environment
   */
  configuring() {
    // Save the repository configuration after all prompting has finished.
    this.config.set('environments', this.environments);

    // Expose all configured environments into the manifest.
    this.manifest.environments = this.environments;

    // Todo: Save all provided configuration.
    this.debug({
      generator: 'Environment',
      answers: this.environments,
    });
  }
}

export = Environment;
