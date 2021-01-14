import Generator from 'yeoman-generator';
import { ManifestDefinition } from './types';
import YAML from 'yaml';

const DEFAULT_MANIFEST_FILE = '.f1-manifest.yml';

export class ManifestHelper {
  protected generator: Generator;
  protected path = DEFAULT_MANIFEST_FILE;

  constructor(generator: Generator, path = DEFAULT_MANIFEST_FILE) {
    this.generator = generator;
    this.path = path;
  }

  /**
   * Test for the existence of a manifest file to use.
   *
   * @param path
   *   (Optional) Specify a specific path for a manifest file to load.
   */
  manifestExists(path?: string): boolean {
    const manifestPath = this.generator.destinationPath(path ?? this.path);

    return this.generator.fs.exists(manifestPath);
  }

  /**
   * Load the manifest file for this project.
   *
   * @param path
   *   (Optional) Specify a specific path for a manifest file to load.
   *
   * @todo Add validation of the loaded manifest file content.
   * @todo Add error-handling for missing or unreadable files.
   */
  loadManifest(path?: string): ManifestDefinition {
    const manifestPath = this.generator.destinationPath(path ?? this.path);

    return YAML.parse(this.generator.fs.read(manifestPath));
  }
}
