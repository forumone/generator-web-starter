import Generator from 'yeoman-generator';
import { RepositoryCollection, RepositoryDefinition } from './types';
import { ResourceCollection } from '../../types';
import { SubGenerator } from '../../subgenerator';

/**
 * A manifest sub-generator responsible for prompting and configuration of repositories.
 */
class Repository extends SubGenerator<RepositoryDefinition> {
  protected configName = 'repositories';
  protected editPrompt = 'Would you like to update your repositories?';

  initializing() {
    return this._doInitializing();
  }

  async prompting() {
    return this._doPrompting();
  }

  async configuring() {
    return this._doConfiguring();
  }

  public _setResources(resources: Record<string, ResourceCollection>): void {
    this.collection = resources.repositories as RepositoryCollection;
  }

  protected _updateManifest(): this {
    this.manifest.repositories = this.collection;

    return this;
  }

  async _promptForCollectionItem(
    item: Partial<RepositoryDefinition> = {},
  ): Promise<RepositoryDefinition> {
    // Prompt for specific configuration options for each repository.
    return this.prompt([
      {
        type: 'input',
        name: 'id',
        message:
          'What should this repository be referenced as? (Example: github, pantheon)',
        default: item.id || 'github',
      },
      {
        type: 'input',
        name: 'url',
        message: 'What is the clone URL for the repository?',
        // Pre-fill an answer to ease testing.
        default:
          item.url || ((answers: Generator.Answers) => `ssh://${answers.id}`),
      },
    ]);
  }
}

export = Repository;
