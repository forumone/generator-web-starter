import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import createDebugger from 'debug';

import spawnComposer from '../../../spawnComposer';

export const drupalProject = 'drupal-composer/drupal-project:8.x-dev';
export type DrupalProject = typeof drupalProject;

export const pantheonProject = 'pantheon-systems/example-drops-8-composer';
export type PantheonProject = typeof pantheonProject;

export type Project = PantheonProject | DrupalProject;

// Define the debugging namespace to align with other debugger output.
const debugNamespace =
  'web-starter:app:plugins:platform:Docker:plugins:cms:Drupal8:installDrupal';
const debug = createDebugger(debugNamespace);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const rimrafAsync = promisify(rimraf);

async function replaceIn(
  path: string,
  search: string | RegExp,
  replacement: string,
): Promise<void> {
  const contents = await readFile(path, 'utf-8');
  return writeFile(path, contents.replace(search, replacement));
}

/**
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
async function injectPlatformConfig(composerPath: string) {
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

  // @todo [WSGEN-1] Fix JSON formatting for the written composer.json file.
  debug('Rewriting composer file %s with added platform configuration.');
  await writeFile(composerPath, JSON.stringify(composer), 'utf-8');
}

export interface InstallDrupalOptions {
  /** Path to the `services/` directory in the generated project. */
  serviceDirectory: string;
  /** Name of the document root (e.g., `web`, `public`) */
  documentRoot: string;
  /** Type of project to install */
  projectType: Project;
}

/** Installs Drupal from a given project installation type. */
async function installDrupal({
  serviceDirectory,
  documentRoot,
  projectType,
}: InstallDrupalOptions): Promise<void> {
  const needsRename = documentRoot !== 'web';

  // Crash early if the user asked for a non-'web' root for a Pantheon project.
  // This will help prevent a lot of headaches due to misalignment with the platform's
  // requirements.
  if (projectType === pantheonProject && needsRename) {
    throw new Error(
      `Pantheon projects do not support '${documentRoot}' as the document root.`,
    );
  }

  debug('Making service directory %s.', serviceDirectory);
  await makeDir(serviceDirectory);

  debug('Executing composer create-project.');
  await spawnComposer(
    [
      'create-project',
      projectType,
      'drupal',
      '--stability',
      'dev',
      '--no-interaction',
      '--ignore-platform-reqs',
      '--no-install',
    ],
    { cwd: serviceDirectory },
  );

  const drupalRoot = path.join(serviceDirectory, 'drupal');

  // Rename 'web' in generated files, if we need to
  if (needsRename) {
    debug('Replacing docroot references from %s to %s.', 'web', documentRoot);
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

  // Composer create-project now "helpfully" installs the web/ directory for us, which
  // we don't want when it isn't the document root.
  if (needsRename) {
    const webRoot = path.join(drupalRoot, 'web');
    await rimrafAsync(webRoot);
  }

  // Inject platform configuration to the generated composer.json file.
  await injectPlatformConfig(path.join(drupalRoot, 'composer.json'));
}

export default installDrupal;
