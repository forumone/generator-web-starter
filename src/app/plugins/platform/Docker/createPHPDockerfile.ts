import { Dockerfile, From } from 'dockerfilejs';

export interface CreatePHPDockerfileOptions {
  from: From;
  buildDeps?: ReadonlyArray<string>;
  configureArgs?: ReadonlyArray<ReadonlyArray<string>>;
  builtins?: ReadonlyArray<string>;
  peclPackages?: ReadonlyArray<string>;
  runtimeDeps?: ReadonlyArray<string>;
  postBuildCommands?: ReadonlyArray<string | ReadonlyArray<string>>;
  xdebug?: boolean;
}

const runDepsCommand = `runDeps="$(\\
    scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \\
      | tr ',' '\\n' \\
      | sort -u \\
      | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \\
  )"`;

function createPHPDockerfile({
  from,
  buildDeps = [],
  builtins = [],
  configureArgs = [],
  peclPackages = [],
  postBuildCommands = [],
  runtimeDeps = [],
  xdebug,
}: CreatePHPDockerfileOptions): Dockerfile {
  const command: Array<string | ReadonlyArray<string>> = [['set', '-ex']];

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

  for (const peclPackage of peclPackages) {
    command.push(
      ['pecl', 'install', peclPackage],
      ['docker-php-ext-enable', peclPackage],
    );
  }

  // Due to the fairly significant performance hits incurred by enabling Xdebug, services
  // with xdebug built-in need to conditionally enable the extension on container startup.
  if (xdebug) {
    command.push(['pecl', 'install', 'xdebug']);
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

  return new Dockerfile().from(from).run({ command });
}

export default createPHPDockerfile;
