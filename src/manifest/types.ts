import Generator from 'yeoman-generator';
import { RepositoryCollection } from './resource/Repository/types';
import { EnvironmentCollection } from './resource/Environment/types';
import { DeploymentCollection } from './deployment/types';

/**
 * A generic base object for identifying any resources being defined.
 */
export interface DefinitionObject {
  readonly id: string;
}

/**
 * A structured interface to capture final Manifest content.
 */
export interface ManifestDefinition {
  readonly version: 'v1';
  readonly projectName: string;
  readonly projectCode?: string;
  readonly platform: 'Docker' | 'JavaScript';
  readonly cms?: 'Drupal7' | 'Drupal8' | 'WordPress';
  readonly gesso: boolean;
  repositories: RepositoryCollection;
  environments: EnvironmentCollection;
  deployments: DeploymentCollection;
}

/**
 * A common interface for all sub-generators to adhere to.
 */
export interface SubGenerator extends Generator {
  /**
   * Get defined resources this generator is responsible for.
   */
  _getResources(): Record<string, ResourceCollection>;

  /**
   * Share known resources for access by this generator.
   */
  _setResources(resources: Record<string, ResourceCollection>): void;

  /**
   * Pass in the manifest object for completion.
   */
  _setManifest(manifest: Partial<ManifestDefinition>): void;
}

/**
 * Base implementation of a common Generator for all sub-generators to extend.
 */
export class SubGenerator extends Generator implements SubGenerator {}

/**
 * A generic type encompassing all known resource config collections.
 */
export type ResourceCollection =
  | RepositoryCollection
  | EnvironmentCollection
  | DeploymentCollection;
