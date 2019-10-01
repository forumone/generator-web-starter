/**
 * Describes a PECL package to be installed into a Docker image.
 */
export interface PeclPackage {
  /**
   * The name of the PECL package.
   */
  name: string;

  /**
   * Whether or not to enable this package by default in the image.
   */
  enabled: boolean;
}

/**
 * This interface represents the aggregated commands and packages needed by the list of
 * dependencies passed to `createPHPDockerfile()`. The values here are mostly intended
 * to be used as the list of things to analyze
 */
interface DockerfileDependencies {
  /**
   * Alpine packages needed by this array of dependencies.
   */
  readonly alpinePackages: ReadonlyArray<string>;

  /**
   * Arrays of commands to configure these dependencies.
   */
  readonly configureCommands: ReadonlyArray<ReadonlyArray<string>>;

  /**
   * The names of all builtin extensions needed for these dependencies.
   */
  readonly builtinExtensions: ReadonlyArray<string>;

  /**
   * The PECL packages needed for these dependencies.
   */
  readonly peclPackages: ReadonlyArray<PeclPackage>;
}

export default DockerfileDependencies;
