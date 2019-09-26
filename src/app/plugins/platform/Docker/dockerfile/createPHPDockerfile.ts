import { Dockerfile, From } from 'dockerfilejs';

import Dependency from './Dependency';

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

const runDepsCommand = `runDeps="$(\\
    scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \\
      | tr ',' '\\n' \\
      | sort -u \\
      | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \\
  )"`;

/**
 * Helper type used in `createPHPDockerfile()`.
 */
interface PeclPackage {
  /**
   * The name of the PECL package.
   */
  name: string;
  /**
   * Whether or not to enable it by default in the image.
   */
  enabled: boolean;
}

function createPHPDockerfile({
  from,
  dependencies = [],
  postBuildCommands = [],
  runtimeDeps = [],
  user,
}: CreatePHPDockerfileOptions): Dockerfile {
  const command: Array<string | ReadonlyArray<string>> = [['set', '-ex']];

  const buildDeps: string[] = [];
  const configureArgs: ReadonlyArray<string>[] = [];
  const builtins: string[] = [];
  const peclPackages: PeclPackage[] = [];

  for (const dependency of dependencies) {
    if (dependency.packages) {
      buildDeps.push(...dependency.packages);
    }

    if (dependency.configureArgs) {
      configureArgs.push(dependency.configureArgs);
    }

    if (dependency.builtins) {
      builtins.push(...dependency.builtins);
    }

    if (dependency.pecl) {
      const { defaultEnabled = true } = dependency;
      const additionalPackages = dependency.pecl.map(
        (name): PeclPackage => ({
          enabled: defaultEnabled,
          name,
        }),
      );

      peclPackages.push(...additionalPackages);
    }
  }

  // First, install all build dependencies
  command.push([
    'apk',
    'add',
    '--no-cache',
    '--virtual',
    '.build-deps',
    '$PHPIZE_DEPS',
    ...buildDeps,
  ]);

  // Run configure for any extensions
  for (const configureArg of configureArgs) {
    command.push(['docker-php-ext-configure', ...configureArg]);
  }

  // Install builtins
  if (builtins.length !== 0) {
    command.push(['docker-php-ext-install', '-j', '$(nproc)', ...builtins]);
  }

  for (const { enabled, name } of peclPackages) {
    command.push(['pecl', 'install', name]);

    if (enabled) {
      command.push(['docker-php-ext-enable', name]);
    }
  }

  // Scan runtime dependencies and force apk to save them in the resulting image
  if (builtins.length !== 0 || peclPackages.length > 0) {
    command.push(runDepsCommand, [
      'apk',
      'add',
      '--virtual',
      '.docker-phpexts-rundeps',
      '$runDeps',
    ]);
  }

  // Remove all build-time dependencies
  command.push(['apk', 'del', '.build-deps']);

  // Add any runtime dependencies (mostly used for building e.g., drush)
  if (runtimeDeps.length !== 0) {
    command.push(['apk', 'add', '--no-cache', ...runtimeDeps]);
  }

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
