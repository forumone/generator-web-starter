import { EnvironmentDefinition } from '../resource/Environment/types';
import { RepositoryDefinition } from '../resource/Repository/types';
import { DefinitionObject } from '../types';

/**
 * A collection of Deployement configuration definitions.
 */
export type DeploymentCollection = Record<string, DeploymentDefinition>;
export type ArtifactDeploymentCollection = Record<
  string,
  ArtifactDeploymentDefinition
>;
export type CapistranoDeploymentCollection = Record<
  string,
  CapistranoDeploymentDefinition
>;

/**
 * Defines valid keys for deployment strategies.
 */
export type DeploymentStrategy = 'capistrano' | 'artifact';

/**
 * A generic definition of configuration for any deployment type.
 *
 * @todo Redefine this as a type union of inheriting interfaces.
 */
export interface DeploymentDefinition extends DefinitionObject {
  readonly environment: string | EnvironmentDefinition;
  readonly strategy: DeploymentStrategy;
  readonly sourceRepository: string | RepositoryDefinition;
  readonly sourceBranch: string;
  readonly targetRepository?: string | RepositoryDefinition;
  readonly targetBranch?: string;
  readonly deployMethod?: 'git' | 'rsync';
  readonly releasesToKeep?: number;
  readonly sourceSubdirectory?: string;
}

/**
 * Deployment configuration for the Capistrano deployment strategy.
 */
export interface CapistranoDeploymentDefinition extends DeploymentDefinition {
  readonly strategy: 'capistrano';
  readonly deployMethod: 'git' | 'rsync';
  readonly releasesToKeep: number;
}

/**
 * Deployment configuration for the Artifact Repository deployment strategy.
 */
export interface ArtifactDeploymentDefinition extends DeploymentDefinition {
  readonly strategy: 'artifact';
  readonly targetRepository: string | RepositoryDefinition;
  readonly targetBranch: string;
}
