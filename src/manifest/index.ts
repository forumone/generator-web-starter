/* eslint-disable no-console */
import Generator from 'yeoman-generator';

const cmsPlugins = ['Drupal7', 'Drupal8', 'WordPress'];
const platform = ['Docker', 'JavaScript'];

class Manifest extends Generator {
  private answers: Generator.Answers = {};

  /**
   * Execute initialization for this generator and trigger subgenerators.
   *
   * @memberof Manifest
   */
  async initializing() {
    const config = this.config.getAll();

    this.answers = config.promptAnswers;

    this.composeWith(require.resolve('./resource/Repository'), {});
    this.composeWith(require.resolve('./resource/Environment'), {});
  }

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Manifest
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

  /**
   * Execute the configuration phase of this generator.
   *
   * @memberof Manifest
   */
  configuring() {
    // Todo: Save all provided configuration.
    console.log(this.answers);
    console.log(this.config.getAll());
  }

  /**
   * Execute the writing phase of this generator.
   *
   * @memberof Manifest
   */
  writing() {
    // Todo: Write generated files.
  }
}

export = Manifest;
