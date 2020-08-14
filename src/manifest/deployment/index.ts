import Generator from 'yeoman-generator';
import {
  DeploymentCollection,
  DeploymentDefinition,
  EnvironmentCollection,
  EnvironmentDefinition,
  ListEntry,
  RepositoryCollection,
} from 'generator-manifest';
import { ListQuestion } from 'inquirer';

const environments = ['Forum One', 'Pantheon', 'Acquia', 'WP-Engine'];
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

  _getEnvironmentSelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    const environmentOptions: string[] = Object.keys(this.environments);

    // @todo Add default selection support.
    const prompt: Generator.Question = {
      type: 'list',
      name: 'deployment',
      message: 'What environment should be deployed to?',
      choices: environmentOptions,
      ...options,
    };

    return prompt;
  }

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

  _getStrategySelectionPrompt(options: Partial<ListQuestion>): ListQuestion {
    // @todo Add default selection support.
    const prompt: ListQuestion = {
      type: 'list',
      name: 'deployment',
      message: 'What deployment strategy should be used for this deployment?',
      choices: strategies,
      ...options,
    };

    return prompt;
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Deployment
   */
  async prompting() {
    // this.deployments = await this._promptForDeployments();

    this.debug({
      generator: 'Deployment',
      repositories: this.repositories,
      deployments: this.deployments,
    });
  }

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

  _promptForDeploymentStrategy() {
    // Todo: Loop to prompt for multiple deployment strategies keyed by type.
    const deploymentQuestions: Generator.Questions = [];

    const answers = this.prompt(deploymentQuestions);
    return answers;
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
      this._getEnvironmentSelectionPrompt({}),
      this._getStrategySelectionPrompt({}),
      {
        type: 'list',
        name: 'type',
        message: 'What type of hosting is used for this deployment?',
        choices: [...deployments, 'Other'],
        default: deployment.type,
      },
      {
        type: 'input',
        name: 'url',
        message: 'What URL is used to access this deployment?',
        default: deployment.url,
      },
      {
        type: 'input',
        name: 'deployPath',
        message: 'What file path should the application deploy to?',
        default: deployment.deployPath,
      },
      {
        type: 'input',
        name: 'branch',
        message: 'What branch should be deployed to this deployment?',
        default: deployment.branch,
      },
      {
        type: 'input',
        name: 'login',
        message: 'What is the login user for this deployment?',
        default: deployment.login,
      },
      {
        type: 'confirm',
        name: 'another',
        message: 'Would you like to add another deployment?',
        default: false,
      },
    ];

    const answers = await this.prompt(deploymentQuestions);

    const deploymentDefinition: DeploymentDefinition = {
      id: answers.id,
      type: answers.type,
      url: answers.url,
      deployPath: answers.deployPath,
      branch: answers.branch,
      login: answers.login,
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
