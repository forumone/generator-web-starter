import { Dockerfile, From } from 'dockerfilejs';

import Dependency from './Dependency';
import computeDependencyBuildCommand from './computeDependencyBuildCommand';

/**
 * Options needed to create a `Dockerfile` object for a PHP-based image.
 */
export interface CreatePHPDockerfileOptions {
  /**
   * The base image to create this from.
   */
  from: From;

  /**
   * Any dependencies (such as the gd builtin or memcached from PECL)
   */
  dependencies?: ReadonlyArray<Dependency>;

  /**
   * Any Alpine packages needed at runtime.
   */
  runtimeDeps?: ReadonlyArray<string>;

  /**
   * Commands to run after all builds have finished - use to inject configuration
   * or otherwise customize the container's environment.
   */
  postBuildCommands?: ReadonlyArray<string | ReadonlyArray<string>>;

  /**
   * The `USER` directive to inject at the end of the build.
   */
  user?: string;
}

function createPHPDockerfile({
  from,
  dependencies = [],
  postBuildCommands = [],
  runtimeDeps = [],
  user,
}: CreatePHPDockerfileOptions): Dockerfile {
  const buildCommand = computeDependencyBuildCommand(dependencies);

  // Use string[][] to allow more straightforward spreading
  const runtimeCommands =
    runtimeDeps.length > 0
      ? [['apk', 'add', '--no-cache', ...runtimeDeps]]
      : [];

  const command: Array<string | ReadonlyArray<string>> = [['set', '-ex']];

  // Add computed build command(s)
  command.push(...buildCommand);

  // Add any runtime dependencies (e.g., SSH for Drush/WP-CLI)
  command.push(...runtimeCommands);

  // Allow post-build setup
  command.push(...postBuildCommands);

  const dockerfile = new Dockerfile().from(from);

  if (user) {
    dockerfile.user('root');
  }

  dockerfile.run({ command });

  if (user) {
    dockerfile.user(user);
  }

  return dockerfile;
}

export default createPHPDockerfile;
