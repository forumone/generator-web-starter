import { ConfigCollection, DefinitionObject } from '../../types';

/**
 * The types of environments that are supported.
 */
type EnvironmentType = 'Forum One' | 'Artifact Repository';

/**
 * Known remote repository services to supported for deployments.
 */
type HostingService =
  | 'Pantheon'
  | 'Acquia'
  | 'WPEngine'
  | 'Platform.sh'
  | 'Other';

/**
 * Generic definition of a deployment environment to be extended.
 */
export interface EnvironmentDefinition extends DefinitionObject {
  readonly type: EnvironmentType;
  readonly url: string;
  readonly deployPath?: string;
  readonly branch?: string;
  readonly login?: string;
  readonly deploymentSubdirectory?: string;
}

/**
 * Environment details required for a Forum One deployment environment.
 */
export interface ForumOneEnvironment extends EnvironmentDefinition {
  readonly type: 'Forum One';
  readonly deployPath: string;
  readonly login: string;
  readonly deploymentSubdirectory?: string;
}

/**
 * Environment details required for a remote repository hosting environment.
 */
export interface ArtifactRepositoryEnvironment extends EnvironmentDefinition {
  readonly type: 'Artifact Repository';
  readonly service?: HostingService;
  readonly deploymentSubdirectory?: string;
}

/**
 * A collection of Environment configuration definitions.
 */
export type EnvironmentCollection = ConfigCollection<EnvironmentDefinition>;
