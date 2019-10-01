import Dependency from './Dependency';
import computeDockerfileDependencies from './computeDockerfileDependencies';

// Command used to scan run-time dependencies and save the names in the $runDeps variable
const runDepsCommand = `runDeps="$(\\
  scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \\
    | tr ',' '\\n' \\
    | sort -u \\
    | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \\
  )"`;

/**
 * Returns the list of commands suitable for injecting into a Docker `RUN` statement
 *
 * @param dependencies
 */
function computeDependencyBuildCommand(
  dependencies: ReadonlyArray<Dependency>,
): ReadonlyArray<string | ReadonlyArray<string>> {
  const {
    alpinePackages,
    builtinExtensions,
    configureCommands,
    peclPackages,
  } = computeDockerfileDependencies(dependencies);

  const hasBuiltins = builtinExtensions.length > 0;
  const hasPeclPackages = peclPackages.length > 0;
  const shouldSaveRunDeps = hasBuiltins || hasPeclPackages;

  const command: Array<string | ReadonlyArray<string>> = [];

  // First, install all build dependencies
  command.push([
    'apk',
    'add',
    '--no-cache',
    '--virtual',
    '.build-deps',
    '$PHPIZE_DEPS',
    ...alpinePackages,
  ]);

  // Run configure for any extensions
  for (const configureCommand of configureCommands) {
    command.push(['docker-php-ext-configure', ...configureCommand]);
  }

  // Install builtins
  if (hasBuiltins) {
    command.push([
      'docker-php-ext-install',
      '-j',
      '$(nproc)',
      ...builtinExtensions,
    ]);
  }

  // Install PECL packages
  for (const { enabled, name } of peclPackages) {
    command.push(['pecl', 'install', name]);
    if (enabled) {
      command.push(['docker-php-ext-enable', name]);
    }
  }

  // Scan runtime dependencies and force apk to save them in the resulting image
  if (shouldSaveRunDeps) {
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

  return command;
}

export default computeDependencyBuildCommand;
