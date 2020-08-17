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
  /**
   * The specific type of hosting environment being deployed to.
   *
   * @type {EnvironmentType}
   * @memberof EnvironmentDefinition
   */
  readonly type: EnvironmentType;

  /**
   * The primary URL used for accessing this environment.
   *
   * @type {string}
   * @memberof EnvironmentDefinition
   */
  readonly url: string;

  /**
   * The server path application code should be deployed to.
   *
   * @type {string}
   * @memberof EnvironmentDefinition
   */
  readonly deployPath?: string;

  /**
   * The repository branch that should be deployed to this environment.
   *
   * @type {string}
   * @memberof EnvironmentDefinition
   */
  readonly branch?: string;

  /**
   * The login user to access this environment for deployment.
   *
   * @type {string}
   * @memberof EnvironmentDefinition
   */
  readonly login?: string;

  /**
   * A subdirectory of the source repository to deploy if needed.
   *
   * @type {string}
   * @memberof EnvironmentDefinition
   */
  readonly sourceSubdirectory?: string;
}

/**
 * Environment details required for a Forum One deployment environment.
 */
export interface ForumOneEnvironment extends EnvironmentDefinition {
  readonly type: 'Forum One';
  readonly deployPath: string;
  readonly login: string;
  readonly sourceSubdirectory?: string;
}

/**
 * Environment details required for a remote repository hosting environment.
 */
export interface ArtifactRepositoryEnvironment extends EnvironmentDefinition {
  readonly type: 'Artifact Repository';
  readonly service?: HostingService;
  readonly sourceSubdirectory?: string;
}

/**
 * A collection of Environment configuration definitions.
 */
export type EnvironmentCollection = ConfigCollection<EnvironmentDefinition>;
