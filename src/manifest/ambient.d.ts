import Generator from 'yeoman-generator';

/**
 * Answer and question types and interfaces for Manifests and subgenerators.
 */
declare namespace ManifestInquirer {
  interface EditAnotherAnswer extends Generator.Answers {
    another: boolean;
  }
}

export interface ListEntry<T> {
  item: T;
  another: boolean;
}

export interface DefinitionObject {
  readonly id: string;
}

export interface Manifest {
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

export interface RepositoryDefinition extends DefinitionObject {
  readonly id: string;
  readonly url: string;
}

export interface EnvironmentDefinition extends DefinitionObject {
  readonly type: string;
  readonly url: string;
  readonly deployPath?: string;
  readonly branch?: string;
  readonly login?: string;
}

export interface ForumOneEnvironment extends EnvironmentDefinition {
  readonly deployPath?: string;
  readonly login?: string;
}

export interface RemoteRepositoryEnvironment extends EnvironmentDefinition {
  readonly service?: string;
  readonly deploymentSubdirectory?: string;
}

export interface ConfigCollection<T extends DefinitionObject> {
  [index: string]: T;
}

export type RepositoryCollection = ConfigCollection<RepositoryDefinition>;

export type EnvironmentCollection = ConfigCollection<EnvironmentDefinition>;

export type DeploymentCollection = ConfigCollection<DeploymentDefinition>;

/**
 * Defines valid keys for deployment strategies.
 */
export type DeploymentStrategy = 'capistrano' | 'artifact';

/**
 * A generic definition of configuration for any deployment type.
 */
export interface DeploymentDefinition extends DefinitionObject {
  readonly environment: string;
  readonly strategy: DeploymentStrategy;
}

/**
 * Deployment configuration for the Capistrano deployment strategy.
 */
export interface CapistranoDeploymentDefinition extends DeploymentDefinition {
  readonly environment: string;
  readonly strategy: 'capistrano';
  readonly deployMethod: 'git' | 'rsync';
  readonly releasesToKeep: number;
  readonly repository: string;
  readonly stages: Record<string, CapistranoStage>;
}

export interface CapistranoStage {
  readonly url: string;
  readonly deployPath: string;
  readonly branch: string;
  readonly role: string;
}

/**
 * Deployment configuration for the Artifact Repository deployment strategy.
 */
export interface ArtifactRepositoryDeploymentDefinition
  extends DeploymentDefinition {
  readonly strategy: 'artifact';
  readonly sourceRepository: string;
  readonly targetRepository: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly sourceSubdirectory?: string;
}
