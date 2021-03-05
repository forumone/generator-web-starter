import Drupal8 from '.';
import rimraf from 'rimraf';
import deepmerge from 'deepmerge';
import { JSONSchema7Array } from 'json-schema';
import fs from 'fs';
import { promisify } from 'util';
import { outputFormat } from '../../../../../../../util';

const servicePath = 'services/drupal';

/**
 * Remove files unused in Forum One project structure.
 *
 * The Pantheon composer project adds a lot of extra files for various forms of
 * automation that Forum One doesn't use. To keep the repository content more
 * targeted, these files may be removed.
 */
async function removeExtraneousFiles(this: Drupal8): Promise<void> {
  // Files relative to the Drupal directory to be removed.
  const filesToRemove = [
    'scripts/github',
    'scripts/gitlab',
    '.circleci',
    'bitbucket-pipelines.yml',
    'build-providers.json',
    '.gitlab-ci.yml',
    '.travis.yml',
  ];

  // Remove each file from the destination if it exists.
  // nb. The files have to be removed directly from the filesystem instead of
  //   using the mem-fs management commands provided by the generator since
  //   the Composer command is creating them as raw files and any changes to them
  //   in mem-fs results in conflicts to be resolved when the generator attempts
  //   to apply the changes.
  //   Since the `composer create-project` command runs outside of the scope of
  //   the mem-fs store after it's created, the store is unaware they exist and
  //   only marks them as deleted files which results in conflics on file commit.
  for (const filePath of filesToRemove) {
    const relativePath = `${servicePath}/${filePath}`;

    await rimraf(this.destinationPath(relativePath), err => {
      if (err !== null) {
        throw err;
      }
    });
  }
}

/**
 * Add any additional Composer dependencies that may be needed.
 */
async function addPantheonComposerDependencies(this: Drupal8): Promise<void> {
  const composerDependencies = [
    'kalamuna/quicksilver-deploy-tools',
    'vlucas/phpdotenv',
  ];

  this.debug(
    outputFormat.debug(
      'Adding Composer dependencies: %s',
      composerDependencies.join(', '),
    ),
  );
  await this.spawnComposer(
    [
      'require',
      ...composerDependencies,
      '--ignore-platform-reqs',
      '--no-scripts',
      '--no-install',
    ],
    {
      cwd: this.destinationPath(servicePath),
    },
  );
}

/**
 * Add necessary configuration to support .env file usage.
 */
async function addEnvSupport(this: Drupal8): Promise<void> {
  // Add the `load.environment.php` file.
  const loadFilePath = `${servicePath}/load.environment.php`;
  this.debug('Copying load.environment.php template to %s.', loadFilePath);
  this.copyTemplate(
    this.templatePath('load.environment.php'),
    this.destinationPath(loadFilePath),
  );

  // Add `composer.json` autoload configuration.
  const composerJsonPath = `${servicePath}/composer.json`;
  const composerJson = this.readDestinationJSON(
    composerJsonPath,
  ) as JSONSchema7Array;

  // Abort if we couldn't parse composer.json as expected.
  if (typeof composerJson !== 'object') {
    throw `Unable to parse ${composerJsonPath}.`;
  }

  // Merge in our new config for the complete composer.json contents.
  const newConfig = { autoload: { files: ['load.environment.php'] } };
  const mergedConfig = deepmerge(composerJson, newConfig);

  // Rewrite the Composer file with added configuration.
  // nb. We need to write the file directly since at this point
  //   mem-fs doesn't have the composer.json file loaded into memory,
  //   so if we attempt to edit it using those utilities the current
  //   state is read as the original content and the changes we add
  //   now later have to be resolved incorrectly and unintuitively
  //   as conflicts.
  this.debug(
    'Adding Composer .env autoload configuration to %s: %o.',
    composerJsonPath,
    newConfig,
  );
  await promisify(fs.writeFile)(
    this.destinationPath(composerJsonPath),
    JSON.stringify(mergedConfig, null, 4),
    'utf-8',
  );
}

/**
 * Run all customizations for the Pantheon composer template.
 */
export default async function postInstallPantheon(
  this: Drupal8,
): Promise<void> {
  this.debug(
    outputFormat.info(
      'Executing post-install customizations for Pantheon projects.',
    ),
  );

  this.debug(
    outputFormat.debug(
      'Adding additional Composer dependencies in %s.',
      'services/drupal',
    ),
  );
  await addPantheonComposerDependencies.call(this);

  this.debug(outputFormat.debug('Configuring .env file support.'));
  await addEnvSupport.call(this);

  this.debug(
    outputFormat.debug(
      'Removing extraneous files from the project template in %s.',
      servicePath,
    ),
  );
  await removeExtraneousFiles.call(this);
}
