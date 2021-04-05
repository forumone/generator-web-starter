import { posix } from 'path';

import DockerfileHelper from '../../../dockerfile/DockerfileHelper';
import { gessoDrupalPath } from '../../gesso/constants';

export interface CreateDrupalDockerfileOptions {
  /**
   * Which PHP tag to use (e.g., `7.4`)
   */
  tag: string;

  /**
   * Whether or not to include the Memcached PECL extension.
   */
  memcached: boolean;

  /**
   * Whether or not Gesso is enabled.
   */
  gesso: boolean;

  /**
   * The name of the document root.
   */
  documentRoot: string;

  /**
   * Source files from the repository to copy into the final image.
   */
  sourceFiles: ReadonlyArray<string>;
}

function createDrupalDockerfile({
  tag,
  memcached,
  documentRoot,
  gesso,
  sourceFiles,
}: CreateDrupalDockerfileOptions) {
  const dockerfile = new DockerfileHelper()
    .from({
      image: 'forumone/drupal8',
      tag: `${tag}-xdebug`,
      stage: 'dev',
    })
    .addMemcachedInstall(memcached)
    .stage()
    .from({
      image: 'forumone/drupal8',
      tag,
      stage: 'base',
    })
    .addMemcachedInstall(memcached)
    .addComposerInstallStage({
      directories: ['scripts'],
      postInstall: ['composer', 'drupal:scaffold'],
      installRoot: documentRoot,
    });

  const gessoPath = gesso
    ? posix.join(documentRoot, gessoDrupalPath)
    : undefined;

  if (gessoPath) {
    dockerfile.addGessoBuildStage(gessoPath);
  }

  dockerfile.addFinalCopyStage({
    buildDirectories: ['scripts', 'vendor', documentRoot],
    gessoPath,
    // Copy the document root over top of the build root: Docker will merge the two
    // directories' contents instead of replacing, so this lets us better utilize the
    // layer cache.
    sourceDirectories: [documentRoot, 'config', 'drush'],
    sourceFiles,
  });

  dockerfile.addTestCopyStage({
    buildDirectories: ['scripts', 'vendor', documentRoot],
    gessoPath,
  });

  return dockerfile;
}

export default createDrupalDockerfile;
