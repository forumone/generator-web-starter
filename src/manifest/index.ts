/* eslint-disable @typescript-eslint/no-unused-vars */
import Generator from 'yeoman-generator';
import inquirer from 'inquirer';

interface Manifest {
  readonly version: 'v1';
  readonly projectName: string;
  readonly projectCode?: string;
  readonly platform: 'Docker' | 'JavaScript';
  readonly cms?: 'Drupal7' | 'Drupal8' | 'WordPress';
  readonly deployment?: DeploymentCollection;
  readonly gesso: boolean;
  repositories: RepositoryCollection;
  hostingEnvironments: HostingEnvironmentCollection;
}

interface RepositoryDefinition {
  readonly remote: string;
}

interface RepositoryCollection {
  [index: string]: RepositoryDefinition;
}

interface HostingEnvironmentDefinition {
  readonly url: string;
  readonly branch?: string;
}

// interface ForumOneEnvironment extends HostingEnvironmentDefinition {
//   readonly deployPath?: string;
//   readonly login?: string;
// }

// interface RemoteRepositoryEnvironment extends HostingEnvironmentDefinition {
//   readonly service?: string;
//   readonly deploymentSubdirectory?: string;
// }

interface HostingEnvironmentCollection {
  [index: string]: HostingEnvironmentDefinition;
}

interface DeploymentCollection {
  readonly capistrano?: Array<CapistranoConfiguration>;
  readonly artifactRepository?: Array<ArtifactRepositoryConfiguration>;
}

interface CapistranoConfiguration {
  readonly deployMethod: 'git' | 'rsync';
  readonly releasesToKeep: number;
  readonly repository: string;
  readonly stages: Record<string, CapistranoStage>;
}

interface CapistranoStage {
  readonly url: string;
  readonly deployPath: string;
  readonly branch: string;
  readonly role: string;
}

interface ArtifactRepositoryConfiguration {
  readonly sourceRepository: string;
  readonly targetRepository: string;
  readonly branchMapping: Array<BranchMapping>;
  readonly sourceDirectory?: string;
}

interface BranchMapping {
  readonly source: string;
  readonly target: string;
}

const cmsPlugins = ['Drupal7', 'Drupal8', 'WordPress'];
const platform = ['Docker', 'JavaScript'];

class Manifest extends Generator {
  // private configuration: Partial<Manifest> = {};
  private answers: inquirer.Answers = {};
  repositories: RepositoryCollection = {};
  hostingEnvironments: HostingEnvironmentCollection = {};
  // private deployments: DeploymentCollection = {};

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

    const repositoryAnswers = await this._promptForRepositories();

    this.answers = {
      ...this.answers,
      ...repositoryAnswers,
    };
  }

  async _promptForRepositories() {
    // Prompt and save initial repository information.
    let answers = await this._promptForRepositoryConfiguration();
    this.repositories[answers.repositoryReference] = {
      remote: answers.repositoryUrl,
    };

    // Loop to prompt for additional repositories.
    while (answers.anotherRepository === true) {
      answers = await this._promptForRepositoryConfiguration();

      this.repositories[answers.repositoryReference] = {
        remote: answers.repositoryUrl,
      };
    }

    return answers;
  }

  async _promptForRepositoryConfiguration(): Promise<inquirer.Answers> {
    // Prompt for specific configuration options for each repository.
    const repositoryConfigQuestions: Generator.Questions = [
      {
        type: 'input',
        name: 'repositoryReference',
        message:
          'What should this repository be referenced as? (Example: github, bitbucket)',
        default: 'github',
        store: true,
      },
      {
        type: 'input',
        name: 'repositoryUrl',
        message: 'What is the clone URL for the repository?',
        store: true,
      },
      {
        type: 'confirm',
        name: 'anotherRepository',
        message: 'Would you like to add another repository?',
        default: false,
      },
    ];

    const answers = await this.prompt(repositoryConfigQuestions);
    return answers;
  }

  async _promptForHostingEnvironments(): Promise<Generator.Answers> {
    // Prompt and save initial environment information.
    let answers = await this._promptForRepositoryConfiguration();
    this.hostingEnvironments[answers.environmentReference] = {
      url: answers.url,
      branch: answers.branch,
    };

    // Loop to prompt for additional repositories.
    while (answers.anotherEnvironment === true) {
      answers = await this._promptForHostingEnvironmentConfiguration();

      this.hostingEnvironments[answers.environmentReference] = {
        url: answers.url,
        branch: answers.branch,
      };
    }

    return answers;
  }

  async _promptForHostingEnvironmentConfiguration(): Promise<inquirer.Answers> {
    // Todo: Prompt for specifics of a given hosting environment.
    const environmentQuestions: Generator.Questions = [
      {
        type: 'input',
        name: 'environmentReference',
        message:
          'What should this environment be referenced as? (Example: dev, stage, production)',
        default: 'public',
        store: true,
      },
      {
        type: 'input',
        name: 'url',
        message: 'What URL is used to access this environment?',
        default: 'public',
        store: true,
      },
      {
        type: 'input',
        name: 'deployPath',
        message: 'What file path should the application deploy to?',
        default: 'public',
        store: true,
      },
      {
        type: 'input',
        name: 'branch',
        message: 'What branch should be deployed to this environment?',
        store: true,
      },
      {
        type: 'input',
        name: 'login',
        message: 'What is the login user for this environment?',
        store: true,
      },
      {
        type: 'confirm',
        name: '',
        message: 'Would you like to add another environment?',
        default: false,
      },
    ];

    const answers = await this.prompt(environmentQuestions);
    return answers;
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

  configuring() {
    // Todo: Save all provided configuration.
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
