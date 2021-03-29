import Generator from 'yeoman-generator';
import { WSGenerator } from '../wsGenerator';
import { ManifestHelper } from './ManifestHelper';
import { ManifestDefinition } from './types';

export interface ManifestAwareOptions extends Generator.GeneratorOptions {
  'manifest-path'?: string;
}

/**
 * Base implementation of a Generator for extension by Generators using manifests.
 */
export abstract class ManifestAwareGenerator extends WSGenerator {
  /**
   * The Manifest Helper utility for interacting with the manifest.
   */
  protected manifestHelper: ManifestHelper;

  /**
   * The manifest object for use by this generator.
   */
  protected manifest: Partial<ManifestDefinition>;

  constructor(args: string | string[], options: ManifestAwareOptions) {
    super(args, options);

    this.manifestHelper = new ManifestHelper(this, options['manifest-path']);

    // Confirm the manifest file exists or abort.
    // @todo Run the manifest generator if a manifest file isn't available.
    if (!this.manifestHelper.manifestExists()) {
      this.debug("Unable to find an existing '.f1-manifest.yml' file.");
      throw new Error(
        "Manifest file '.f1-manifest.yml' does not exist. Please run the web-starter:manifest generator to create one.",
      );
    }

    // Read in the manifest file and save the deployment configuration.
    this.manifest = this.manifestHelper.loadManifest();
  }
}
