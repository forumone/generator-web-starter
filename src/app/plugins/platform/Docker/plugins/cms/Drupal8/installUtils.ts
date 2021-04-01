import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Drupal8 from '.';
import tmp from 'tmp';
import { color } from '../../../../../../../log';
import { ChildProcess } from 'child_process';

const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function replaceIn(
  path: string,
  search: string | RegExp,
  replacement: string,
): Promise<void> {
  const contents = await readFile(path, 'utf-8');
  return writeFile(path, contents.replace(search, replacement));
}

/**
 * Apply replacements to rename the web root in generated files.
 */
export async function renameWebRoot(
  this: Drupal8,
  documentRoot: string,
  drupalRoot: string,
): Promise<void> {
  this.debug(
    'Replacing docroot references from %s to %s.',
    'web',
    documentRoot,
  );
  await Promise.all([
    replaceIn(
      path.join(drupalRoot, 'composer.json'),
      /web\//g,
      `${documentRoot}/`,
    ),
    replaceIn(
      path.join(drupalRoot, '.gitignore'),
      /web\//g,
      `${documentRoot}/`,
    ),
    replaceIn(
      path.join(drupalRoot, 'scripts/composer/ScriptHandler.php'),
      /\/web/g,
      `/${documentRoot}`,
    ),
    replaceIn(path.join(drupalRoot, 'README.md'), /web/g, documentRoot),
  ]);
}

/**
 * Inject platform configuration dependencies into a project's composer.json file.
 *
 * Updates a Composer file to include Drupal's extension requirements. Since we always
 * run Composer in a container separate from our Drupal site, doing this allows us to
 * document which extensions are installed without having to install Composer into the
 * site image.
 *
 * After this function is run, `composer update` is needed in order for Composer to
 * pick up the newly-injected platform configuration.
 *
 * @param composerPath Path to `composer.json`
 */
export async function injectPlatformConfig(
  this: Drupal8,
  composerPath: string,
): Promise<void> {
  const composer = JSON.parse(await readFile(composerPath, 'utf-8'));

  // Ensure that composer.config.platform is defined before we write to it
  if (!('config' in composer)) {
    composer.config = {};
  }

  const config = composer.config;

  if (!('platform' in config)) {
    config.platform = {};
  }

  const platform = config.platform;

  // Although drupal/core lists quite a few dependencies (see https://packagist.org/packages/drupal/core),
  // it appears that most are available in stock PHP installations. The list below is
  // based on the required extensions and what is built for the Docker Hub's Drupal 8
  // image.
  const platformExtensions = ['gd', 'opcache', 'pdo'];

  for (const extension of platformExtensions) {
    // The version number of 1.0.0 holds no special meaning other than that it is a valid
    // semver version. Composer only checks its existence (not its value) when examining
    // the platform config section.
    platform[`ext-${extension}`] = '1.0.0';
  }

  this.debug('Rewriting composer file %s with added platform configuration.');
  await writeFile(composerPath, JSON.stringify(composer, null, 4), 'utf-8');
}

/**
 * Copy files from the temporary directory installation to the destination directory.
 *
 * @param this
 * @param tempDirectory
 * @param destination
 */
async function syncTempDirectory(
  this: Drupal8,
  tempDirectory: string,
  destination: string,
) {
  this.debug(
    color.debug(
      'Copying temporary Drupal installation from %s into %s.',
      tempDirectory,
      destination,
    ),
  );
  this.copyDestination(tempDirectory, this.destinationPath(destination));
}

/**
 * Execute the `composer create-project` command in the specified directory.
 *
 * If a temporary directory is used, as specified by `useTemp`, the installed files
 * are installed to the existing directory.
 * @param this
 * @param cwd
 * @param useTemp
 * @returns
 */
async function installDrupalProject(
  this: Drupal8,
  cwd: string,
): Promise<ChildProcess> {
  return this.spawnComposer(
    [
      'create-project',
      this.projectType,
      'drupal',
      '--stability',
      'dev',
      '--no-interaction',
      '--ignore-platform-reqs',
      '--no-install',
    ],
    {
      cwd,
    },
  );
}

/**
 * Get the working directory where the project should be scaffolded to.
 *
 * This accounts for creating a temporary directory and getting the path
 * if necessary based on the `useTemp` flag.
 *
 * @param this
 * @param useTemp Whether to use a temporary directory.
 * @returns The path to the directory where the project should be installed.
 */
async function getCwd(this: Drupal8, useTemp = false): Promise<string> {
  if (!useTemp) {
    return this.destinationPath('services');
  }

  this.debug(
    color.debug(
      'Identified existing installation at %s. Creating temporary directory.',
    ),
    'services/drupal',
  );

  // Create the new temporary directory.
  return new Promise((resolve, reject) => {
    // Flag for unsafe cleanup to empty out the existing files in the directory.
    tmp.dir({ unsafeCleanup: true }, (err, path) => {
      if (err) {
        reject(err);
      }

      this.debug(
        color.debug('Created temporary installation directory at %s.'),
        path,
      );
      resolve(path);
    });
  });
}

/**
 * Install the Drupal project files in place.
 *
 * If an existing installation of Drupal is in place, a temporary directory is
 * used to install the fresh install and overwrite it into place for review.
 *
 * @param this
 */
export async function createDrupalProject(this: Drupal8): Promise<void> {
  // Determine if the project was previously created.
  const useTemp = this.existsDestination('services/drupal/composer.json');

  // Create the service directory if it doesn't exist.
  // If the services directory doesn't exist, Docker fails since it can't mount
  // it as a volume mount.
  if (!this.existsDestination('services')) {
    this.debug(
      'Creating services directory at %s.',
      this.destinationPath('services'),
    );
    try {
      await mkdir(this.destinationPath('services'), { recursive: true });
    } catch (err) {
      this.error(
        'Failed to create services directory at %s.',
        this.destinationPath('services'),
      );
      if (this.options.debug) {
        // Show the contents of the directory for debugging.
        // @todo Output the content of this with more debugging message context
        //   around it.
        this.spawnCommandSync('ls', ['-al']);
      }
      this.env.error(err);
    }
  }

  // Get the target installation directory.
  const cwd = await getCwd.call(this, useTemp);

  this.info('Triggering Drupal project scaffolding in %s.', cwd);
  await installDrupalProject.call(this, cwd).catch(() => {
    this.env.error(
      new Error(color.error('Composer `create-project` command failed.')),
    );
  });

  // Sync the temporary installation into place if necessary.
  if (useTemp) {
    syncTempDirectory.call(
      this,
      `${cwd}/drupal`,
      this.destinationPath('services/drupal'),
    );
  }
}
