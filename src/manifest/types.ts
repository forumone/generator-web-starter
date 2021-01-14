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
 * A generic type encompassing all known resource config collections.
 */
export type ResourceCollection =
  | RepositoryCollection
  | EnvironmentCollection
  | DeploymentCollection;
