import Generator from 'yeoman-generator';
import {
  ManifestDefinition,
  ManifestInquirer,
  RepositoryCollection,
  RepositoryDefinition,
  ResourceCollection,
  SubGenerator,
} from '../../ambient';

type RepositoryConfigurationEntry = ManifestInquirer.ConfigurationListEntry<
  RepositoryDefinition
>;
type EditAnotherRepositoryQuestionSet = ManifestInquirer.EditAnotherQuestionSet<
  RepositoryDefinition
>;

class Repository extends SubGenerator {
  private repositories: RepositoryCollection = {};
  private answers: Generator.Answers = {};
  private manifest!: Partial<ManifestDefinition>;

  /**
   * Execute initialization for this generator.
   *
   * @memberof Repository
   */
  async initializing() {
    const config = this.config.getAll();

    this.answers = config.promptAnswers || {};
    this.repositories = config.repositories || {};
  }

  /**
   * @inheritdoc
   */
  public getResources(): Record<string, ResourceCollection> {
    return {
      repositories: this.repositories,
    };
  }

  /**
   * @inheritdoc
   */
  public setResources(resources: Record<string, ResourceCollection>): void {
    this.repositories = resources.repositories as RepositoryCollection;
  }

  /**
   * Propogate the manifest object in to assign values we're responsible for.
   *
   * @param {Partial<ManifestDefinition>} manifest
   * @memberof Deployment
   */
  public setManifest(manifest: Partial<ManifestDefinition>) {
    this.manifest = manifest;
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Repository
   */
  async prompting() {
    this.repositories = await this._promptForRepositories();
  }

  async _promptForRepositories(): Promise<RepositoryCollection> {
    // Loop to enable updates and creation of new repositories.
    let another = true;
    while (another === true) {
      // Select an entry to edit or create a new one.
      const { edit } = await this.prompt([
        {
          type: 'list',
          name: 'edit',
          message: 'Would you like to update your repositories?',
          choices: [...Object.keys(this.repositories), 'Add new', 'No'],
        },
      ]);

      let repositoryConfig;
      if (edit === 'No') {
        another = false;
      } else {
        if (edit === 'Add new') {
          repositoryConfig = undefined;
        } else {
          repositoryConfig = this.repositories[edit];
        }

        // Prompt for the configuration changes with the existing config if available.
        const itemConfigAnswers = await this._promptForRepositoryConfiguration(
          repositoryConfig,
        );

        // Save the configuration and check whether to continue the loop.
        this.repositories[itemConfigAnswers.item.id] = itemConfigAnswers.item;
        another = itemConfigAnswers.another;
      }
    }

    return this.repositories;
  }

  /**
   * Prompt for configuration of a specific repository.
   *
   * @returns {Promise<RepositoryConfigurationEntry>}
   * @memberof Repository
   */
  async _promptForRepositoryConfiguration(
    repository: Partial<RepositoryDefinition> = {},
  ): Promise<RepositoryConfigurationEntry> {
    // Prompt for specific configuration options for each repository.
    const repositoryConfigQuestions: EditAnotherRepositoryQuestionSet = [
      {
        type: 'input',
        name: 'id',
        message:
          'What should this repository be referenced as? (Example: github, bitbucket)',
        default: repository.id || 'github',
      },
      {
        type: 'input',
        name: 'url',
        message: 'What is the clone URL for the repository?',
        default:
          repository.url ||
          ((answers: Generator.Answers) => `ssh://${answers.id}`),
      },
      {
        type: 'confirm',
        name: 'another',
        message: 'Would you like to update another repository?',
        default: false,
      },
    ];

    const answers = await this.prompt(repositoryConfigQuestions);

    // Spread to capture all properties automatically regardless of questions prompted.
    const { another, ...repositoryDefinition } = answers;

    return {
      another,
      item: repositoryDefinition,
    };
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Repository
   */
  configuring() {
    // Save the repository configuration after all prompting has finished.
    this.config.set('repositories', this.repositories);

    // Expose all configured repositories into the manifest.
    this.manifest.repositories = this.repositories;

    // Todo: Save all provided configuration.
    this.debug({
      generator: 'Repository',
      answers: this.answers,
    });
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof Repository
   */
  writing() {
    // Todo: Write generated files.
  }
}

export = Repository;
