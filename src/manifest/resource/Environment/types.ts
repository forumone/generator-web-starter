import { DefinitionObject } from '../../types';

/**
 * The types of environments that are supported.
 */
type EnvironmentType = 'Forum One' | 'Artifact Repository';

/**
 * Known remote repository services to supported for deployments.
 */
export type HostingService =
  | 'Pantheon'
  | 'Acquia'
  | 'WPEngine'
  | 'Platform.sh'
  | 'Other';

/**
 * Generic definition of a deployment environment to be extended.
 */
export interface EnvironmentDefinition extends DefinitionObject {
  /**
   * The specific type of hosting environment being deployed to.
   */
  readonly type: EnvironmentType;

  /**
   * The primary URL used for accessing this environment.
   */
  readonly url: string;

  /**
   * The server path application code should be deployed to.
   */
  readonly deployPath?: string;

  /**
   * The login user to access this environment for deployment.
   */
  readonly login?: string;
}

/**
 * Environment details required for a Forum One deployment environment.
 */
export interface ForumOneEnvironment extends EnvironmentDefinition {
  readonly type: 'Forum One';
  readonly deployPath: string;
  readonly login: string;
}

/**
 * Environment details required for a remote repository hosting environment.
 */
export interface ArtifactRepositoryEnvironment extends EnvironmentDefinition {
  readonly type: 'Artifact Repository';
  readonly service?: HostingService;
}

/**
 * A collection of Environment configuration definitions.
 */
export type EnvironmentCollection = Record<string, EnvironmentDefinition>;
