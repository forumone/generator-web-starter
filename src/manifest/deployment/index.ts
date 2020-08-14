import Generator from 'yeoman-generator';
import {
  DeploymentCollection,
  DeploymentDefinition,
  EnvironmentCollection,
  ListEntry,
  RepositoryCollection,
} from 'generator-manifest';
import { ListQuestion } from 'inquirer';

const strategies = ['Capistrano', 'Artifact Repository'];

class Deployment extends Generator {
  private repositories: RepositoryCollection = {};
  private environments: EnvironmentCollection = {};
  private deployments: DeploymentCollection = {};

  /**
   * Set the known repositories for configuration usage.
   *
   * @param {RepositoryCollection} repositories
   * @memberof Deployment
   */
  public setRepositories(repositories: RepositoryCollection) {
    this.repositories = repositories;
  }

  /**
   * Set the known environments for configuration usage.
   *
   * @param {EnvironmentCollection} environments
   * @memberof Deployment
   */
  public setEnvironments(environments: EnvironmentCollection) {
    this.environments = environments;
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
    const prompt: Generator.Question = {
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
    const prompt: Generator.Question = {
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
      const { edit } = await this.prompt([
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

  _promptForCapistranoDeployment() {
    // Todo: Prompt for configuration needed in a Capistrano deployment.
    const capistranoQuestions: Generator.Questions = [];

    const answers = this.prompt(capistranoQuestions);
    return answers;
  }

  _promptForArtifactDeployment() {
    // Todo: Prompt for configuration needed in an artifact deployment.
    const artifactQuestions: Generator.Questions = [{}];

    const answers = this.prompt(artifactQuestions);
    return answers;
  }

  /**
   * Prompt for configuration details of a specific deployment.
   *
   * @param {Partial<DeploymentDefinition>} [deployment={}]
   *   Optional deployment details to populate default answers for editing.
   * @returns {Promise<ListEntry<DeploymentDefinition>>}
   * @memberof Deployment
   */
  async _promptForDeploymentConfiguration(
    deployment: Partial<DeploymentDefinition> = {},
  ): Promise<ListEntry<DeploymentDefinition>> {
    // Prompt for specifics of the deployment.
    const deploymentQuestions: Generator.Questions = [
      {
        type: 'input',
        name: 'id',
        message:
          'What should this deployment be referenced as? (Example: dev, stage, production)',
        default: deployment.id,
      },
      this._getEnvironmentSelectionPrompt({
        message: 'What environment is being deployed to?',
      }),
      this._getStrategySelectionPrompt({
        message: 'What deployment method should be used for this deployment?',
      }),
      {
        type: 'confirm',
        name: 'another',
        message: 'Would you like to add or update another deployment?',
        default: false,
      },
    ];

    const answers = await this.prompt(deploymentQuestions);

    const deploymentDefinition: DeploymentDefinition = {
      id: answers.id,
      environment: answers.environment,
      strategy: answers.strategy,
    };

    return {
      item: deploymentDefinition,
      another: answers.another,
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
