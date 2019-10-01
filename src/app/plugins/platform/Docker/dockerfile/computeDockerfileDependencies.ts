import Dependency from './Dependency';
import DockerfileDependencies, { PeclPackage } from './DockerfileDependencies';

/**
 * Computes low-level dependencies for a Dockerfile build. This function is responsible
 * for taking high-level `Dependency` objects and converting them into the low-level
 * elements (Alpine packages needed for `apk add`, lists of configure commands, etc.)
 * that are used in generating an image.
 *
 * @param dependencies Array of PHP packages (PECL or builtin) this image depends on
 */
function computeDockerfileDependencies(
  dependencies: ReadonlyArray<Dependency>,
): DockerfileDependencies {
  const alpinePackages: string[] = [];
  const configureCommands: ReadonlyArray<string>[] = [];
  const builtinExtensions: string[] = [];
  const peclPackages: PeclPackage[] = [];

  for (const dependency of dependencies) {
    if (dependency.packages) {
      alpinePackages.push(...dependency.packages);
    }

    if (dependency.configureCommand) {
      configureCommands.push(dependency.configureCommand);
    }

    if (dependency.builtins) {
      builtinExtensions.push(...dependency.builtins);
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

  return {
    alpinePackages,
    builtinExtensions,
    configureCommands,
    peclPackages,
  };
}

export default computeDockerfileDependencies;
