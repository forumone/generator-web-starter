import { posix } from 'path';

import DockerfileHelper from '../../../dockerfile/DockerfileHelper';
import { gessoWordPressPath } from '../../gesso/constants';

export interface CreateWordPressDockerfileOptions {
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
   * Whether or not Composer is used on this project.
   */
  composer: boolean;

  /**
   * The name of the document root.
   */
  documentRoot: string;
}

const moveDockerfile =
  'if test -e .env.production; then mv .env.production .env; fi';

function createWordPressDockerfile({
  tag,
  memcached,
  documentRoot,
  gesso,
  composer,
}: CreateWordPressDockerfileOptions) {
  const dockerfile = new DockerfileHelper()
    .from({
      image: 'forumone/wordpress',
      tag: `${tag}-xdebug`,
      stage: 'dev',
    })
    .addMemcachedInstall(memcached)
    .stage()
    .from({
      image: 'forumone/wordpress',
      tag,
      stage: 'base',
    })
    .addMemcachedInstall(memcached);

  if (composer) {
    dockerfile.addComposerInstallStage({
      installRoot: documentRoot,
    });
  }
  const gessoPath = gesso
    ? posix.join(documentRoot, gessoWordPressPath)
    : undefined;

  if (gessoPath) {
    dockerfile.addGessoBuildStage(gessoPath);
  }

  const buildDirectories = composer ? [documentRoot] : undefined;

  // Create the release stage.
  dockerfile
    .addFinalCopyStage({
      buildDirectories,
      gessoPath,
      sourceDirectories: [documentRoot],
    })
    .run(moveDockerfile);

  // Create the test stage.
  dockerfile.addTestCopyStage({
    buildDirectories,
    gessoPath,
  });

  return dockerfile;
}

export default createWordPressDockerfile;
