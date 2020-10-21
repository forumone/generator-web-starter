import fs from 'fs';
import YAML from 'yaml';
import { Collection, YAMLMap, YAMLSeq } from 'yaml/types';

/**
 * A helper class for manipulating Docker Compose files.
 */
export class ComposeHelper {
  private path: string;
  private doc?: YAML.Document.Parsed;

  /**
   * Create a new ComposeHelper for working with a specified Docker Compose file.
   *
   * @param path The path to the Docker Compose file to be managed.
   */
  constructor(path: string) {
    this.path = path;
  }

  /**
   * Get the raw parsed YAML Document.
   */
  document(): YAML.Document.Parsed {
    if (this.doc === undefined) {
      this.doc = ComposeHelper.loadFile(this.path);
    }

    return this.doc;
  }

  /**
   * Parse a Docker Compose file at a given path.
   *
   * @param path The path to the Docker Compose file to parse.
   */
  static loadFile(path: string): YAML.Document.Parsed {
    const file = fs.readFileSync(path, 'utf8');
    const doc = YAML.parseDocument(file);

    return doc;
  }

  /**
   * Fetch the YAML collection of defined services.
   */
  services(): Collection {
    return this.document().get('services');
  }

  /**
   * Fetch the YAML configuration for a specific service.
   *
   * @param name The name of the service to fetch.
   */
  service(name: string): YAMLMap {
    return this.services().get(name);
  }

  /**
   * Determine if a specific service exists within the document.
   *
   * @param name The name of the service to check for.
   */
  hasService(name: string) {
    return this.services().has(name) !== undefined;
  }

  /**
   * Add a service definition to the Docker Compose configuration.
   *
   * @param name The name of the service to define.
   * @param config The YAML content collection to use for the service.
   */
  addService(name: string, config: Collection) {
    this.services().set(name, config);

    return this;
  }

  /**
   * Fetch the list of volumes defined in the Docker Compose file.
   */
  volumes(): YAMLSeq {
    return this.document().get('volumes');
  }

  /**
   * Return the document as YAML output.
   */
  toString(): string {
    return this.document().toString();
  }
}
