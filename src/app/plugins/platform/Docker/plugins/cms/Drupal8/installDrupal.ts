import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';

import spawnComposer from '../../../spawnComposer';

export const drupalProject = 'drupal-composer/drupal-project:8.x-dev';
export type DrupalProject = typeof drupalProject;

export const pantheonProject = 'pantheon-systems/example-drops-8-composer';
export type PantheonProject = typeof pantheonProject;

export type Project = PantheonProject | DrupalProject;

// Promisify our utility methods.
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const rimrafAsync = promisify(rimraf);

/**
 * Replace values into a given file.
 *
 * @param {string} path
 * @param {(string | RegExp)} search
 * @param {string} replacement
 * @returns {Promise<void>}
 */
async function replaceIn(
  path: string,
  search: string | RegExp,
  replacement: string,
): Promise<void> {
  const contents = await readFile(path, 'utf-8');
  return writeFile(path, contents.replace(search, replacement));
}

/**
 * An interface for required Drupal project configuration options.
 *
 * @export
 * @interface InstallDrupalOptions
 */
export interface InstallDrupalOptions {
  /** Path to the `services/` directory in the generated project. */
  serviceDirectory: string;
  /** Name of the document root (e.g., `web`, `public`) */
  documentRoot: string;
  /** Type of project to install */
  projectType: Project;
}

/**
 * Installs Drupal from a given project installation type.
 *
 * @param {InstallDrupalOptions}
 * @returns {Promise<void>}
 */
async function installDrupal(
  installOptions: InstallDrupalOptions,
): Promise<void> {
  // @todo Revise this to use better syntax options.
  const projectType = installOptions.projectType;

  // Confirm a valid web root was selected for the platform.
  // @todo Refactor for cleaner use of params.
  await validateWebRoot(installOptions);

  // Prepare the service container directory for Drupal.
  await scaffoldServiceDirectory(installOptions);

  // Ensure the web root is renamed if necessary.
  const drupalRoot = await renameWebRoot(installOptions);

  // Apply post-scaffolding composer updates.
  await applyComposerUpdates(drupalRoot);

  // Perform project-specific operations.
  await customizeByProjectType(projectType, drupalRoot);
}

/**
 * Apply composer updates needed after initial scaffolding.
 *
 * @param {string} drupalRoot
 */
async function applyComposerUpdates(drupalRoot: string) {
  // Make sure the lock file is up to date.
  await spawnComposer(['update', '--lock', '--ignore-platform-reqs'], {
    cwd: drupalRoot,
  });
}

/**
 * Apply type-specific project customizations as needed.
 *
 * @param {string} projectType
 * @param {string} drupalRoot
 */
async function customizeByProjectType(projectType: string, drupalRoot: string) {
  // NB. We have to specify the 'composer' command explicitly, as these aren't known
  // to the Docker entrypoint.
  // @todo Refactor this project-type customization into a Project object.
  switch (projectType) {
    case drupalProject:
      await spawnComposer(['composer', 'drupal:scaffold'], { cwd: drupalRoot });
      break;
    case pantheonProject:
      await spawnComposer(['composer', 'prepare-for-pantheon'], {
        cwd: drupalRoot,
      });
      break;
  }
}

/**
 * Rename the generated web root if necessary.
 *
 * @param {InstallDrupalOptions} {
 *     serviceDirectory,
 *     documentRoot,
 *   }
 * @returns {Promise<string>} - The path to the Drupal installation root.
 */
async function renameWebRoot({
  serviceDirectory,
  documentRoot,
}: InstallDrupalOptions): Promise<string> {
  const drupalRoot = path.join(serviceDirectory, 'drupal');

  // Rename 'web' in generated files, if we need to.
  if (documentRoot !== 'web') {
    await Promise.all([
      replaceIn(path.join(drupalRoot, 'composer.json'), /web\//g, documentRoot + '/'),
      replaceIn(path.join(drupalRoot, '.gitignore'), /web\//g, documentRoot + '/'),
      replaceIn(path.join(drupalRoot, 'scripts/composer/ScriptHandler.php'), /\/web/g, '/' + documentRoot),
      replaceIn(path.join(drupalRoot, 'README.md'), /web/g, documentRoot),
    ]);

    // Composer create-project now "helpfully" installs the web/ directory for us, which
    // we don't want when it isn't the document root.
    const webRoot = path.join(drupalRoot, 'web');
    await rimrafAsync(webRoot);
  }

  return drupalRoot;
}

/**
 * Confirm a valid web root selction was made for the selected platform.
 *
 * @param InstallDrupalOptions - Project installation options for validation.
 *
 * @throws Throws an error if an invalid web root name was selected.
 */
async function validateWebRoot({
  projectType,
  documentRoot,
}: InstallDrupalOptions): Promise<void> {
  // Crash early if the user asked for a non-'web' root for a Pantheon project.
  // This will help prevent a lot of headaches due to misalignment with the platform's
  // requirements.
  if (projectType === pantheonProject && documentRoot !== 'web') {
    throw new Error(
      `Pantheon projects do not support '${documentRoot}' as the document root.`,
    );
  }
}

/**
 * Use Composer to scaffold the service and project directory.
 *
 * @param {InstallDrupalOptions} {
 *   serviceDirectory,
 *   projectType,
 * }
 * @returns {Promise<void>}
 */
async function scaffoldServiceDirectory({
  serviceDirectory,
  projectType,
}: InstallDrupalOptions): Promise<void> {
  await makeDir(serviceDirectory);
  // Use composer to scaffold from the selected template project.
  await spawnComposer([
    'create-project',
    projectType,
    'drupal',
    '--stability',
    'dev',
    '--no-interaction',
    '--ignore-platform-reqs',
  ], { cwd: serviceDirectory });
}

export default installDrupal;
