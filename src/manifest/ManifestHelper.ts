import fs from 'fs';
import Generator from 'yeoman-generator';
import { ManifestDefinition } from './types';
import YAML from 'yaml';

/**
 * The default filename for a manifest file to be loaded.
 */
const DEFAULT_MANIFEST_FILE = '.f1-manifest.yml';

export class ManifestHelper {
  protected generator: Generator;
  protected path: string;
  protected doc?: YAML.Document.Parsed;

  /**
   * Create a new ManifestHelper for a specified manifest file.
   *
   * @param generator The Yeoman generator using the manifest file.
   * @param filename The name of the manifest file to be loaded.
   *   This value is assumed to contain only the name of the file to
   *   be found in the generator's destination path.
   */
  constructor(generator: Generator, filename = DEFAULT_MANIFEST_FILE) {
    this.generator = generator;
    this.path = generator.destinationPath(filename);
  }

  /**
   * Parse and load the project's manifest file.
   */
  document(): YAML.Document.Parsed {
    if (this.doc === undefined) {
      const file = fs.readFileSync(this.path, 'utf8');
      this.doc = YAML.parseDocument(file);
    }

    return this.doc;
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
    const manifestPath =
      path === undefined ? this.path : this.generator.destinationPath(path);

    return YAML.parse(this.generator.fs.read(manifestPath));
  }

  /**
   * Fetch the manifest value at the given path.
   *
   * @param key The path to the value to be loaded.
   *   This key may either be a string value or an array of keys to indicate
   *   a deeper path within the file.
   */
  get(key: string | []) {
    return this.document().get(key);
  }

  /**
   * Test if a value at the given path is defined within the manifest.
   *
   * @param key The path to the value to be loaded.
   *   This key may either be a string value or an array of keys to indicate
   *   a deeper path within the file.
   */
  has(key: string | []) {
    return this.document().has(key);
  }
}
