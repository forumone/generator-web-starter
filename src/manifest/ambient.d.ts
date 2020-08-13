declare module 'generator-manifest' {
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
    // readonly deployment?: DeploymentCollection;
    readonly gesso: boolean;
    repositories: RepositoryCollection;
    environments: EnvironmentCollection;
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

  export interface DeploymentDefinition extends DefinitionObject {}

  export interface CapistranoConfiguration {
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

  export interface ArtifactRepositoryConfiguration {
    readonly sourceRepository: string;
    readonly targetRepository: string;
    readonly branchMapping: Array<BranchMapping>;
    readonly sourceDirectory?: string;
  }

  export interface BranchMapping {
    readonly source: string;
    readonly target: string;
  }
}
