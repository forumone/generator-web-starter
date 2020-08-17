import { EnvironmentDefinition } from '../resource/Environment/types';
import { RepositoryDefinition } from '../resource/Repository/types';
import { ConfigCollection } from '../types';

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
