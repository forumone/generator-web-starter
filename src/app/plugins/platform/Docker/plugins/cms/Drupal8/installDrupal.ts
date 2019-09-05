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

  await makeDir(serviceDirectory);

  await spawnComposer(
    [
      'create-project',
      projectType,
      'drupal',
      '--stability',
      'dev',
      '--no-interaction',
      '--ignore-platform-reqs',
    ],
    { cwd: serviceDirectory },
  );

  const drupalRoot = path.join(serviceDirectory, 'drupal');

  // Rename 'web' in generated files, if we need to
  if (needsRename) {
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

  // Make sure the lock file is up to date.
  await spawnComposer(['update', '--lock', '--ignore-platform-reqs'], {
    cwd: drupalRoot,
  });

  // Perform project-specific operations.
  // NB. We have to specify the 'composer' command explicitly, as these aren't known
  // to the Docker entrypoint.
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

export default installDrupal;
