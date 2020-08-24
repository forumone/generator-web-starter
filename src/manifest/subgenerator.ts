import Generator from 'yeoman-generator';
import {
  DefinitionObject,
  ManifestDefinition,
  ResourceCollection,
} from './types';

/**
 * Base implementation of a common Generator for all sub-generators to extend.
 */
export abstract class SubGenerator<
  T extends DefinitionObject
> extends Generator {
  /**
   * The collection of resources managed by this generator.
   */
  protected collection: Record<string, T> = {};

  /**
   * The manifest object for completion by this generator.
   */
  protected manifest!: Partial<ManifestDefinition>;

  /**
   * The name of the configuration resource managed by this generator.
   */
  protected abstract configName: string;

  /**
   * The prompt to be displayed for editing this generator's resources.
   */
  protected abstract editPrompt: string;

  /**
   * Prompt for configuration details of an individual resource item.
   *
   * @param item Optional values for previously completed item details.
   * @return The configuration details from this resource's editing prompts.
   */
  protected abstract _promptForCollectionItem(item?: Partial<T>): Promise<T>;

  /**
   * Update the manifest with this generator's resources.
   */
  protected abstract _updateManifest(): this;

  /**
   * Get defined resources this generator is responsible for.
   */
  _getCollection(): Record<string, T> {
    return this.collection;
  }

  /**
   * Share known resources for access by this generator.
   */
  abstract _setResources(resources: Record<string, ResourceCollection>): void;

  /**
   * Pass in the manifest object for completion.
   */
  _setManifest(manifest: Partial<ManifestDefinition>): this {
    this.manifest = manifest;

    return this;
  }

  /**
   * Execute the initialization phase for this generator.
   */
  initializing() {
    this.collection = this.config.get(this.configName) || {};
  }

  /**
   * Execute the prompting phase for this generator.
   */
  async prompting() {
    // Loop prompting until the user selects to end editing.
    while (true) {
      const { edit } = await this.prompt({
        type: 'list',
        name: 'edit',
        message: this.editPrompt,
        choices: [...Object.keys(this.collection), 'Add new', 'No'],
      });

      if (edit === 'No') {
        break;
      }

      const config = edit === 'Add new' ? undefined : this.collection[edit];

      const item = await this._promptForCollectionItem(config);
      this.collection[item.id] = item;

      const { another } = await this.prompt({
        type: 'confirm',
        name: 'another',
        message: 'Would you like to continue editing?',
        default: false,
      });

      if (!another) {
        break;
      }
    }
  }

  /**
   * Execute the configuration phase for this generator.
   */
  configuring() {
    this.config.set(this.configName, this.collection);
    this._updateManifest();
  }
}
