import { ManifestInquirer } from '../ambient';
import { ManifestDefinition, ResourceCollection, SubGenerator } from '../types';
import {
  Answers,
  ListChoiceOptions,
  ListQuestion,
  QuestionCollection,
} from 'inquirer';
import {
  ArtifactDeploymentDefinition,
  CapistranoDeploymentDefinition,
  DeploymentCollection,
  DeploymentDefinition,
  DeploymentStrategy,
} from './types';
import { RepositoryCollection } from '../resource/Repository/types';
import { EnvironmentCollection } from '../resource/Environment/types';

type DeploymentConfigurationEntry = ManifestInquirer.ConfigurationListEntry<
  DeploymentDefinition
>;
type EditAnotherDeploymentQuestionSet = ManifestInquirer.EditAnotherQuestionSet<
  DeploymentDefinition
>;

const strategies: Array<ListChoiceOptions> = [
  {
    name: 'Capistrano',
    value: 'capistrano',
  },
  {
    name: 'Artifact Repository',
    value: 'artifact',
  },
];

class Deployment extends SubGenerator {
  private repositories: RepositoryCollection = {};
  private environments: EnvironmentCollection = {};
  private deployments: DeploymentCollection = {};
  private manifest!: Partial<ManifestDefinition>;

  /**
   * Execute initialization for this generator.
   *
   * @memberof Deployment
   */
  async initializing() {
    const config = this.config.getAll();

    this.deployments = config.deployments || {};
  }

  /**
   * @inheritdoc
   */
  public getResources(): Record<string, ResourceCollection> {
    return {
      deployments: this.deployments,
    };
  }

  /**
   * @inheritdoc
   */
  public setResources(resources: Record<string, ResourceCollection>): void {
    this.repositories = resources.repositories as RepositoryCollection;
    this.environments = resources.environments as EnvironmentCollection;
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
   * Create a standardized prompt for selecting a configured repository.
   *
   * @param {Partial<ListQuestion>} options
   *   Override options to contextualize the presentation of the prompt.
   * @returns {ListQuestion}
   *   The contextualized prompt ready to be used.
   * @memberof Deployment
   */
  _getRepositorySelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const repositoryOptions: string[] = Object.keys(this.repositories);

    // @todo Add default selection support.
    const prompt: ListQuestion = {
      type: 'list',
      name: 'repository',
      message: 'What repository should be used?',
      choices: repositoryOptions,
      ...options,
    };

    return prompt;
  }

  /**
   * Create a standardized prompt for selecting a configured environment.
   *
   * @param {Partial<ListQuestion>} options
   *   Override options to contextualize the presentation of the prompt.
   * @returns {ListQuestion}
   *   The contextualized prompt ready to be used.
   * @memberof Deployment
   */
  _getEnvironmentSelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const environmentOptions: string[] = Object.keys(this.environments);

    // @todo Add default selection support.
    const prompt: ListQuestion = {
      type: 'list',
      name: 'environment',
      message: 'What environment should be deployed to?',
      choices: environmentOptions,
      ...options,
    };

    return prompt;
  }

  /**
   * Create a standardized prompt for selecting a configured deployment.
   *
   * @param {Partial<ListQuestion>} options
   *   Override options to contextualize the presentation of the prompt.
   * @returns {ListQuestion}
   *   The contextualized prompt ready to be used.
   * @memberof Deployment
   */
  _getDeploymentSelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const deploymentOptions: string[] = Object.keys(this.deployments);

    // @todo Add default selection support.
    const prompt: ListQuestion = {
      type: 'list',
      name: 'deployment',
      message: 'What deployment would you like to modify?',
      choices: deploymentOptions,
      ...options,
    };

    return prompt;
  }

  /**
   * Create a standardized prompt for selecting an available deployment strategy.
   *
   * @param {Partial<ListQuestion>} options
   *   Override options to contextualize the presentation of the prompt.
   * @returns {ListQuestion}
   *   The contextualized prompt ready to be used.
   * @memberof Deployment
   */
  _getStrategySelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    // @todo Add default selection support.
    const prompt: ListQuestion = {
      type: 'list',
      name: 'strategy',
      message: 'What deployment strategy should be used for this deployment?',
      choices: strategies,
      ...options,
    };

    return prompt;
  }

  /**
   * Execute the prompting phase of this generator.
   *
   * @memberof Deployment
   */
  async prompting() {
    this.deployments = await this._promptForDeployments();

    this.debug({
      generator: 'Deployment',
      repositories: this.repositories,
      deployments: this.deployments,
    });
  }

  /**
   * Execute looped prompting for editing and creating deployments.
   *
   * @returns {Promise<DeploymentCollection>}
   * @memberof Deployment
   */
  async _promptForDeployments(): Promise<DeploymentCollection> {
    // Loop to enable updates and creation of new deployments.
    let another = true;
    while (another === true) {
      // Select an entry to edit or create a new one.
      const { edit }: { edit: string } = await this.prompt([
        {
          type: 'list',
          name: 'edit',
          message: 'Would you like to update your deployment configurations?',
          choices: [...Object.keys(this.deployments), 'Add new', 'No'],
        },
      ]);

      let deploymentConfig;
      if (edit === 'No') {
        another = false;
      } else {
        if (edit === 'Add new') {
          deploymentConfig = undefined;
        } else {
          deploymentConfig = this.deployments[edit];
        }

        // Prompt for the configuration changes with the existing config if available.
        const itemConfigAnswers = await this._promptForDeploymentConfiguration(
          deploymentConfig,
        );

        // Save the configuration and check whether to continue the loop.
        this.deployments[itemConfigAnswers.item.id] = itemConfigAnswers.item;
        another = itemConfigAnswers.another;
      }
    }

    return this.deployments;
  }

  /**
   * Prompt for configuration details of a specific deployment.
   *
   * @param {Partial<DeploymentDefinition>} [deployment={}]
   *   Optional deployment details to populate default answers for editing.
   * @returns {Promise<DeploymentConfigurationEntry>}
   * @memberof Deployment
   */
  async _promptForDeploymentConfiguration(
    deployment: Partial<DeploymentDefinition> = {},
  ): Promise<DeploymentConfigurationEntry> {
    const prompts: EditAnotherDeploymentQuestionSet = [
      {
        type: 'input',
        name: 'id',
        message:
          'What should this deployment be referenced as? (Example: dev, stage, production)',
        default: deployment.id,
      },
      this._getEnvironmentSelectionPrompt({
        message: 'What environment is being deployed to?',
        default: deployment.environment,
      }),
      this._getStrategySelectionPrompt({
        message: 'What deployment method should be used for this deployment?',
        default: deployment.strategy,
      }),
    ];

    // Prompt for specifics of the deployment.
    const answers = await this.prompt(prompts)
      .then(async answers => {
        const strategyPrompts = this._getStrategyPrompts(
          answers.strategy,
          deployment,
        );

        // Trigger additional prompts and combine answers with previous responses.
        const strategyAnswers = await this.prompt(strategyPrompts);
        return {
          ...answers,
          ...strategyAnswers,
        };
      })
      .then(async answers => {
        const { another }: { another: boolean } = await this.prompt([
          {
            type: 'confirm',
            name: 'another',
            message: 'Would you like to add or update another deployment?',
            default: false,
          },
        ]);

        return {
          ...answers,
          another,
        };
      });

    // Spread to capture all properties automatically regardless of questions prompted.
    const { another, ...deploymentDefinition } = answers;

    return {
      another,
      item: deploymentDefinition,
    };
  }

  /**
   * Get additional prompts specific to the strategy being used.
   *
   * @param {DeploymentStrategy} strategy
   * @param {Answers} [answers={}]
   * @returns {QuestionCollection<DeploymentDefinition>}
   * @memberof Deployment
   */
  _getStrategyPrompts(
    strategy: DeploymentStrategy,
    answers: Answers = {},
  ): QuestionCollection<DeploymentDefinition> {
    switch (strategy) {
      case 'artifact':
        return this._getArtifactDeploymentPrompts(answers);

      case 'capistrano':
        return this._getCapistranoDeploymentPrompts(answers);

      default:
        throw new Error(`Unknown deployment strategy: ${strategy}`);
    }
  }

  /**
   * Get prompts for customizing the Capistrano deployment strategy.
   *
   * @param {Partial<CapistranoDeploymentDefinition>} [answers={}]
   * @returns {QuestionCollection<DeploymentDefinition>}
   * @memberof Deployment
   */
  _getCapistranoDeploymentPrompts(
    answers: Partial<CapistranoDeploymentDefinition> = {},
  ): QuestionCollection<DeploymentDefinition> {
    const $prompts: QuestionCollection<DeploymentDefinition> = [
      {
        type: 'number',
        name: 'releasesToKeep',
        message: 'How many past releases should be kept?',
        default: answers.releasesToKeep || 3,
      },
    ];

    return $prompts;
  }

  /**
   * Get prompts for customizing the Artifact Deployment strategy.
   *
   * @param {Partial<ArtifactDeploymentDefinition>} [answers={}]
   * @returns {QuestionCollection<DeploymentDefinition>}
   * @memberof Deployment
   */
  _getArtifactDeploymentPrompts(
    answers: Partial<ArtifactDeploymentDefinition> = {},
  ): QuestionCollection<DeploymentDefinition> {
    const $prompts: QuestionCollection = [
      this._getRepositorySelectionPrompt({
        name: 'sourceRepository',
        message: 'What source repository is being deployed from?',
        default: answers.sourceRepository,
      }),
      {
        type: 'input',
        name: 'sourceBranch',
        message: 'What source branch is being deployed from?',
        default: answers.sourceBranch,
      },
      this._getRepositorySelectionPrompt({
        name: 'targetRepository',
        message: 'What remote repository is being deployed to?',
        default: answers.targetRepository,
      }),
      {
        type: 'input',
        name: 'targetBranch',
        message: 'What target branch is being deployed to?',
        default: answers.targetBranch,
      },
      {
        type: 'input',
        name: 'sourceSubdirectory',
        message: 'What path within the source repository should be deployed?',
        default: answers.sourceSubdirectory,
      },
    ];

    return $prompts;
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Deployment
   */
  configuring() {
    // Save the repository configuration after all prompting has finished.
    this.config.set('deployments', this.deployments);

    this.manifest.deployments = {
      ...this.deployments,
    };

    // Expand reference values into each deployment configuration.
    for (const [id, deployment] of Object.entries(this.deployments)) {
      const expandedDeployment = {
        ...deployment,
      };

      // Expand the environment definition.
      if (typeof deployment.environment === 'string') {
        const envId = deployment.environment;
        expandedDeployment.environment = this.environments[envId];
      }

      // Expand the source repository definition.
      if (typeof deployment.sourceRepository === 'string') {
        const repoId = deployment.sourceRepository;
        expandedDeployment.sourceRepository = this.repositories[repoId];
      }

      // Expand the target repository definition if it exists.
      if (
        expandedDeployment.strategy === 'artifact' &&
        typeof expandedDeployment.targetRepository === 'string'
      ) {
        const repoId = expandedDeployment.targetRepository;
        expandedDeployment.targetRepository = this.repositories[repoId];
      }

      this.manifest.deployments[id] = expandedDeployment;
    }

    // Todo: Save all provided configuration.
    this.debug({
      generator: 'deployment',
      deployments: this.deployments,
    });
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof Deployment
   */
  writing() {
    // Todo: Write generated files.
  }
}

export = Deployment;
