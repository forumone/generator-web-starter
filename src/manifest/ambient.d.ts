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
