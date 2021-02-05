import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import createDebugger from 'debug';

// Define the debugging namespace to align with other debugger output.
const debugNamespace =
  'web-starter:app:plugins:platform:Docker:plugins:cms:Drupal8:installDrupal';
const debug = createDebugger(debugNamespace);

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
  documentRoot: string,
  drupalRoot: string,
): Promise<void> {
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
export async function injectPlatformConfig(
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

  debug('Rewriting composer file %s with added platform configuration.');
  await writeFile(composerPath, JSON.stringify(composer, null, 4), 'utf-8');
}
