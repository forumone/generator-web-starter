/**
 * A `Dependency` object represents one or more PHP dependencies to be installed into
 * an image. This abstracts away from the machinery used to install a package regardless
 * of its source.
 */
interface Dependency {
  /**
   * Which PHP builtin(s) this dependency represents.
   */
  readonly builtins?: ReadonlyArray<string>;

  /**
   * The args needed to configure this dependency.
   */
  readonly configureArgs?: ReadonlyArray<string>;

  /**
   * If this dependency represents a PECL package, should it be enabled by default
   * in the image?
   *
   * This option defaults to `true` and exists largely to support the case of installing
   * XDebug - if that package is enabled by default, there is a significant performance
   * penalty for all site requests, even if the user isn't engaged in a debugging
   * session.
   */
  readonly defaultEnabled?: boolean;

  /**
   * Alpine packages needed to install to build/run this dependency.
   */
  readonly packages?: ReadonlyArray<string>;

  /**
   * PECL packages to be installed for this dependency.
   */
  readonly pecl?: ReadonlyArray<string>;
}

export default Dependency;
