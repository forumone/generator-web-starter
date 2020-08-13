/* eslint-disable no-console */
import Generator from 'yeoman-generator';
import {
  DeploymentCollection,
  EnvironmentCollection,
  EnvironmentDefinition,
  ListEntry,
  RepositoryCollection,
} from 'generator-manifest';

const environments = ['Forum One', 'Pantheon', 'Acquia', 'WP-Engine'];

class Deployment extends Generator {
  repositories: RepositoryCollection = {};
  environments: EnvironmentCollection = {};
  deployments: DeploymentCollection = {};
  private answers: Generator.Answers = {};

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Deployment
   */
  async prompting() {
    // this.deployments = await this._promptForDeployments();

    this.debug({
      generator: 'deployment',
      repositories: this.repositories,
      environments: this.environments,
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
          deploymentConfig = this.environments[edit];
        }

        // Prompt for the configuration changes with the existing config if available.
        const itemConfigAnswers = await this._promptForHostingEnvironmentConfiguration(
          deploymentConfig,
        );

        // Save the configuration and check whether to continue the loop.
        this.environments[itemConfigAnswers.item.id] = itemConfigAnswers.item;
        another = itemConfigAnswers.another;
      }
    }

    return this.environments;
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
    const artifactQuestions: Generator.Questions = [];

    const answers = this.prompt(artifactQuestions);
    return answers;
  }

  async _promptForHostingEnvironmentConfiguration(
    environment: Partial<EnvironmentDefinition> = {},
  ): Promise<ListEntry<EnvironmentDefinition>> {
    // Prompt for specifics of a given hosting environment.
    const environmentQuestions: Generator.Questions = [
      {
        type: 'input',
        name: 'id',
        message:
          'What should this environment be referenced as? (Example: dev, stage, production)',
        default: environment.id,
      },
      {
        type: 'list',
        name: 'type',
        message: 'What type of hosting is used for this environment?',
        choices: [...environments, 'Other'],
        default: environment.type,
      },
      {
        type: 'input',
        name: 'url',
        message: 'What URL is used to access this environment?',
        default: environment.url,
      },
      {
        type: 'input',
        name: 'deployPath',
        message: 'What file path should the application deploy to?',
        default: environment.deployPath,
      },
      {
        type: 'input',
        name: 'branch',
        message: 'What branch should be deployed to this environment?',
        default: environment.branch,
      },
      {
        type: 'input',
        name: 'login',
        message: 'What is the login user for this environment?',
        default: environment.login,
      },
      {
        type: 'confirm',
        name: 'another',
        message: 'Would you like to add another environment?',
        default: false,
      },
    ];

    const answers = await this.prompt(environmentQuestions);

    const environmentDefinition: EnvironmentDefinition = {
      id: answers.id,
      type: answers.type,
      url: answers.url,
      deployPath: answers.deployPath,
      branch: answers.branch,
      login: answers.login,
    };

    return {
      item: environmentDefinition,
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
    this.config.set('environments', this.environments);

    // Todo: Save all provided configuration.
    this.debug({
      generator: 'deployment',
      answers: this.answers,
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
