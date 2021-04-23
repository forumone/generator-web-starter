import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Drupal from '.';
import { color } from '../../../../../../../log';
import { ChildProcess } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComposerJson = { [x: string]: any };

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
  this: Drupal,
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
 * Execute the `composer create-project` command in the specified directory.
 * @param this
 * @param cwd
 * @returns
 */
async function installDrupalProject(
  this: Drupal,
  cwd: string,
): Promise<void | ChildProcess> {
  return this.spawnComposer(
    [
      'create-project',
      this.projectUpstream,
      '.',
      '--stability',
      'dev',
      '--no-interaction',
      '--ignore-platform-reqs',
      '--no-install',
    ],
    {
      cwd,
    },
  ).catch(() => {
    this.env.error(
      new Error(color.error('Composer `create-project` command failed.')),
    );
  });
}

/**
 * Install the Drupal project files in place.
 *
 * @param this
 */
export async function createDrupalProject(
  this: Drupal,
): Promise<void | ChildProcess> {
  // Create the service directory if it doesn't exist.
  // If the services directory doesn't exist, Docker fails since it can't mount
  // it as a volume mount.
  if (!this.existsDestination(this.servicePath)) {
    this.debug(
      'Creating service directory at %s.',
      this.destinationPath(this.servicePath),
    );
    try {
      await mkdir(this.destinationPath(this.servicePath), { recursive: true });
    } catch (err) {
      this.error(
        'Failed to create service directory at %s.',
        this.destinationPath(this.servicePath),
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

  const cwd = this.destinationPath(this.servicePath);
  this.info('Triggering Drupal project scaffolding in %s.', cwd);
  return installDrupalProject.call(this, cwd);
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
 * @param composer Loaded JSON data from the `composer.json` file to be updated in-place.
 */
function addPlatformRequirements(composer: ComposerJson): void {
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
}

function addProjectName(composer: ComposerJson, projectName: string): void {
  if (
    composer.name === 'forumone/drupal-project' ||
    composer.name === 'drupal-composer/drupal-project'
  ) {
    composer.name = `forumone/${projectName}`;
  }
}

export async function standardizeComposerJson(this: Drupal): Promise<void> {
  const composerPath = `${this.servicePath}/composer.json`;
  const composer: ComposerJson = JSON.parse(
    await readFile(composerPath, 'utf-8'),
  );

  // Inject platform configuration to the generated composer.json file.
  this.info('Injecting platform configuration into composer.json.');
  addPlatformRequirements(composer);
  addProjectName(composer, this.appname);
}
