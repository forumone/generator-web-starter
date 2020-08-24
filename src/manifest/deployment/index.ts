import { ConfigurationListEntry } from '../ambient';
import { ManifestDefinition, ResourceCollection, SubGenerator } from '../types';
import { ListChoiceOptions, ListQuestion } from 'inquirer';
import { DeploymentCollection, DeploymentDefinition } from './types';
import { RepositoryCollection } from '../resource/Repository/types';
import { EnvironmentCollection } from '../resource/Environment/types';
import { Questions } from 'yeoman-generator';

type DeploymentConfigurationEntry = ConfigurationListEntry<
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

/**
 * A Manifest sub-generator responsible for prompting and configuration of deployments.
 *
 * This generator is dependent on both the Environment and Repository sub-generators as well.
 */
class Deployment extends SubGenerator {
  private repositories: RepositoryCollection = {};
  private environments: EnvironmentCollection = {};
  private deployments: DeploymentCollection = {};
  private manifest!: Partial<ManifestDefinition>;

  /**
   * Execute initialization for this generator.
   *
   * @todo Pre-load configuration from the YAML manifest file.
   */
  async initializing() {
    const config = this.config.getAll();

    this.deployments = config.deployments || {};
  }

  public _getResources(): Record<string, ResourceCollection> {
    return {
      deployments: this.deployments,
    };
  }

  public _setResources(resources: Record<string, ResourceCollection>): void {
    this.repositories = resources.repositories as RepositoryCollection;
    this.environments = resources.environments as EnvironmentCollection;
  }

  public _setManifest(manifest: Partial<ManifestDefinition>) {
    this.manifest = manifest;
  }

  /**
   * Create a standardized prompt for selecting a configured repository.
   *
   * @param options Override options to contextualize the presentation of the prompt.
   * @returns The contextualized prompt ready to be used.
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
   * @param options Override options to contextualize the presentation of the prompt.
   * @returns The contextualized prompt ready to be used.
   */
  _getEnvironmentSelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const environmentOptions: string[] = Object.keys(this.environments);

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
   * @param options Override options to contextualize the presentation of the prompt.
   * @returns The contextualized prompt ready to be used.
   */
  _getDeploymentSelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const deploymentOptions: string[] = Object.keys(this.deployments);

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
   * @param options Override options to contextualize the presentation of the prompt.
   * @returns The contextualized prompt ready to be used.
   */
  _getStrategySelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
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
   * @todo Consolidate this edit loop into a reusable prompt type.
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
   * @param deployment Optional deployment details to populate default answers for editing.
   */
  async _promptForDeploymentConfiguration(
    deployment: Partial<DeploymentDefinition> = {},
  ): Promise<DeploymentConfigurationEntry> {
    const prompts: Questions<DeploymentDefinition> = [
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
      this._getRepositorySelectionPrompt({
        name: 'sourceRepository',
        message: 'What source repository is being deployed from?',
        default: deployment.sourceRepository,
      }),
      // @todo Add suggestions for the source branch based on common deployment ID values.
      {
        type: 'input',
        name: 'sourceBranch',
        message: 'What source branch is being deployed from?',
        default: deployment.sourceBranch,
      },
      this._getRepositorySelectionPrompt({
        name: 'targetRepository',
        message: 'What remote repository is being deployed to?',
        default: deployment.targetRepository,
        when: answers => answers.strategy === 'artifact',
      }),
      // @todo Add suggestions for the target branch based on common deployment ID values.
      // @todo Pre-fill this from the branch value in the environment definition.
      {
        type: 'input',
        name: 'targetBranch',
        message: 'What target branch is being deployed to?',
        default: deployment.targetBranch,
        when: answers => answers.strategy === 'artifact',
      },
      // @todo Add suggestions for the source subdirectory based on target environment values.
      // @todo Pre-fill this from the sourceSubdirectory value in the environment definition.
      {
        type: 'input',
        name: 'sourceSubdirectory',
        message: 'What path within the source repository should be deployed?',
        default: deployment.sourceSubdirectory,
      },
      {
        type: 'number',
        name: 'releasesToKeep',
        message: 'How many past releases should be kept?',
        default: deployment.releasesToKeep || 3,
        when: answers => answers.strategy === 'capistrano',
      },
    ];

    // Prompt for specifics of the deployment.
    const answers = await this.prompt(prompts).then(async answers => {
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
      // Spread into a new object to avoid changing the original copy.
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

    this.debug({
      generator: 'Deployment',
      deployments: this.deployments,
    });
  }
}

export = Deployment;
