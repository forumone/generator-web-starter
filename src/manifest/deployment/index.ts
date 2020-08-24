import { ResourceCollection } from '../types';
import { ListChoiceOptions } from 'inquirer';
import { DeploymentDefinition } from './types';
import { RepositoryCollection } from '../resource/Repository/types';
import { EnvironmentCollection } from '../resource/Environment/types';
import { SubGenerator } from '../subgenerator';
import { Questions } from 'yeoman-generator';

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
class Deployment extends SubGenerator<DeploymentDefinition> {
  private repositories: RepositoryCollection = {};
  private environments: EnvironmentCollection = {};
  protected configName = 'deployments';
  protected editPrompt = 'Would you like to update your deployments?';

  _setResources(resources: Record<string, ResourceCollection>): void {
    this.repositories = resources.repositories as RepositoryCollection;
    this.environments = resources.environments as EnvironmentCollection;
  }

  protected _updateManifest(): this {
    this.manifest.deployments = this.collection;

    return this;
  }

  /**
   * Prompt for configuration details of a specific deployment.
   *
   * @param deployment Optional deployment details to populate default answers for editing.
   */
  async _promptForCollectionItem(
    item: Partial<DeploymentDefinition> = {},
  ): Promise<DeploymentDefinition> {
    const repositoryOptions: string[] = Object.keys(this.repositories);
    const environmentOptions: string[] = Object.keys(this.environments);

    return this.prompt([
      {
        type: 'input',
        name: 'id',
        message:
          'What should this deployment be referenced as? (Example: dev, stage, production)',
        default: item.id,
      },
      {
        type: 'list',
        name: 'environment',
        message: 'What environment is being deployed to?',
        choices: environmentOptions,
        default: item.environment,
      },
      {
        type: 'list',
        name: 'strategy',
        message: 'What deployment strategy should be used for this deployment?',
        choices: strategies,
        default: item.strategy,
      },
      {
        type: 'list',
        name: 'sourceRepository',
        message: 'What source repository is being deployed from?',
        default: item.sourceRepository,
        choices: repositoryOptions,
      },
      // @todo Add suggestions for the source branch based on common deployment ID values.
      {
        type: 'input',
        name: 'sourceBranch',
        message: 'What source branch is being deployed from?',
        default: item.sourceBranch,
      },
      {
        type: 'list',
        name: 'targetRepository',
        message: 'What remote repository is being deployed to?',
        default: item.targetRepository,
        choices: repositoryOptions,
        when: answers => answers.strategy === 'artifact',
      },
      // @todo Add suggestions for the target branch based on common deployment ID values.
      // @todo Pre-fill this from the branch value in the environment definition.
      {
        type: 'input',
        name: 'targetBranch',
        message: 'What target branch is being deployed to?',
        default: item.targetBranch,
        when: answers => answers.strategy === 'artifact',
      },
      // @todo Add suggestions for the source subdirectory based on target environment values.
      // @todo Pre-fill this from the sourceSubdirectory value in the environment definition.
      {
        type: 'input',
        name: 'sourceSubdirectory',
        message: 'What path within the source repository should be deployed?',
        default: item.sourceSubdirectory,
      },
      {
        type: 'number',
        name: 'releasesToKeep',
        message: 'How many past releases should be kept?',
        default: item.releasesToKeep || 3,
        when: answers => answers.strategy === 'capistrano',
      },
    ] as Questions<DeploymentDefinition>);
  }

  /**
   * Execute the configuration phase of this generator.
   */
  configuring() {
    // Save the repository configuration after all prompting has finished.
    this.config.set('deployments', this.collection);
    this._updateManifest();

    this.manifest.deployments = {
      ...this.collection,
    };

    // Expand reference values into each deployment configuration.
    for (const [id, deployment] of Object.entries(this.collection)) {
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
      deployments: this.collection,
    });
  }
}

export = Deployment;
