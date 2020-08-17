import Generator from 'yeoman-generator';

/**
 * Answer and question types and interfaces for Manifests and subgenerators.
 */
declare namespace ManifestInquirer {
  interface ConfigurationListEntry<T> {
    item: T;
    another: boolean;
  }

  /**
   * Response set for item configuration values and query to edit another.
   */
  export type EditAnotherQuestionSet<
    T extends Generator.Answers
  > = Generator.Questions<T & { another: boolean }>;
}

/**
 * A generic base object for identifying any resources being defined.
 */
export interface DefinitionObject {
  readonly id: string;
}

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

export class SubGenerator extends Generator {
  /**
   * Get defined resources this generator is responsible for.
   *
   * @returns {Record<string, ResourceCollection>}
   * @memberof SubGenerator
   */
  public getResources(): Record<string, ResourceCollection>;

  /**
   * Share known resources for access by this generator.
   *
   * @param {Record<string, ResourceCollection>} resources
   * @memberof SubGenerator
   */
  public setResources(resources: Record<string, ResourceCollection>): void;

  /**
   * Pass in the manifest object for completion.
   *
   * @param {Partial<ManifestDefinition>} manifest
   * @memberof SubGenerator
   */
  public setManifest(manifest: Partial<ManifestDefinition>): void;
}

/**
 * Base information defining a repository for use.
 */
export interface RepositoryDefinition extends DefinitionObject {
  readonly id: string;
  readonly url: string;
}

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
 * A generic collection of configuration for saving resources.
 */
export interface ConfigCollection<T extends DefinitionObject> {
  [index: string]: T;
}

/**
 * A generic type encompassing all know resource config collections.
 */
export type ResourceCollection =
  | RepositoryCollection
  | EnvironmentCollection
  | DeploymentCollection;

/**
 * A collection of Repository configuration definitions.
 */
export type RepositoryCollection = ConfigCollection<RepositoryDefinition>;

/**
 * A collection of Environment configuration definitions.
 */
export type EnvironmentCollection = ConfigCollection<EnvironmentDefinition>;

/**
 * A collection of Deployement configuration definitions.
 */
export type DeploymentCollection = ConfigCollection<DeploymentDefinition>;

/**
 * Defines valid keys for deployment strategies.
 */
export type DeploymentStrategy = 'capistrano' | 'artifact';

/**
 * A generic definition of configuration for any deployment type.
 */
export type DeploymentDefinition =
  | CapistranoDeploymentDefinition
  | ArtifactDeploymentDefinition;

/**
 * Deployment configuration for the Capistrano deployment strategy.
 */
export type CapistranoDeploymentDefinition = {
  readonly id: string;
  readonly environment: string | EnvironmentDefinition;
  readonly strategy: 'capistrano';
  readonly sourceRepository: string | RepositoryDefinition;
  readonly deployMethod: 'git' | 'rsync';
  readonly releasesToKeep: number;
  readonly sourceSubdirectory?: string;
};

/**
 * Deployment configuration for the Artifact Repository deployment strategy.
 */
export type ArtifactDeploymentDefinition = {
  readonly id: string;
  readonly environment: string | EnvironmentDefinition;
  readonly strategy: 'artifact';
  readonly sourceRepository: string | RepositoryDefinition;
  readonly targetRepository: string | RepositoryDefinition;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly sourceSubdirectory?: string;
};
