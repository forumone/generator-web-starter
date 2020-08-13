import Generator from 'yeoman-generator';
import {
  EnvironmentCollection,
  EnvironmentDefinition,
  ListEntry,
} from 'generator-manifest';

const environments = ['Forum One', 'Pantheon', 'Acquia', 'WP-Engine'];

class Environment extends Generator {
  environments: EnvironmentCollection = {};

  /**
   * Execute initialization for this generator.
   *
   * @memberof Environment
   */
  async initializing() {
    const config = this.config.getAll();

    this.environments = config.environments;
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Environment
   */
  async prompting() {
    this.environments = await this._promptForEnvironments();
  }

  async _promptForEnvironments(): Promise<EnvironmentCollection> {
    // Loop to enable updates and creation of new environments.
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

    // @todo The deployPath option doesn't seem to be getting saved.
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
   * @memberof Environment
   */
  configuring() {
    // Save the repository configuration after all prompting has finished.
    this.config.set('environments', this.environments);

    // Todo: Save all provided configuration.
    this.debug({
      generator: 'Environment',
      answers: this.environments,
    });
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof Environment
   */
  writing() {
    // Todo: Write generated files.
  }
}

export = Environment;