import { ResourceCollection } from '../../types';
import { EnvironmentCollection, EnvironmentDefinition } from './types';
import { SubGenerator } from '../../subgenerator';

const environments = ['Forum One', 'Pantheon', 'Acquia', 'WPEngine'];

/**
 * A manifest sub-generator responsible for prompting and configuration of environments.
 */
class Environment extends SubGenerator<EnvironmentDefinition> {
  protected configName = 'environments';
  protected editPrompt = 'Would you like to update your environments?';

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
    this.collection = resources.environments as EnvironmentCollection;
  }

  protected _updateManifest(): this {
    this.manifest.environments = this.collection;

    return this;
  }

  async _promptForCollectionItem(
    item: Partial<EnvironmentDefinition> = {},
  ): Promise<EnvironmentDefinition> {
    // Prompt for specific configuration options for each environment.
    return this.prompt([
      {
        type: 'input',
        name: 'id',
        message:
          'What should this environment be referenced as? (Example: dev, stage, production)',
        default: item.id || 'dev',
      },
      {
        type: 'list',
        name: 'type',
        message: 'What type of hosting is used for this environment?',
        choices: [...environments, 'Other'],
        default: item.type || 'Forum One',
      },
      // @todo Add some form of URL masking or suggestions.
      {
        type: 'input',
        name: 'url',
        message: 'What URL is used to access this environment?',
        default: item.url,
      },
      {
        type: 'input',
        name: 'login',
        message: 'What is the login user for this environment?',
        default: item.login,
        when: answers => answers.type === 'Forum One',
      },
      // @todo: Pre-fill this with a suggested path.
      {
        type: 'input',
        name: 'deployPath',
        message: 'What file path should the application deploy to?',
        default: item.deployPath,
        when: answers => answers.type === 'Forum One',
      },
    ]);
  }
}

export = Environment;
