import { DefinitionObject } from '../../types';

/**
 * Base information defining a repository for use.
 */
export interface RepositoryDefinition extends DefinitionObject {
  readonly id: string;
  readonly url: string;
}

/**
 * A collection of Repository configuration definitions.
 */
export type RepositoryCollection = Record<string, RepositoryDefinition>;
