import Generator from 'yeoman-generator';

/**
 * Answer interface for interactions within the edit loop for resources.
 */
export interface ConfigurationListEntry<T> {
  item: T;
  another: boolean;
}

/**
 * Response set for item configuration values and query to edit another.
 */
export type EditAnotherQuestionSet<
  T extends Generator.Answers
> = Generator.Questions<T & { another: boolean }>;
