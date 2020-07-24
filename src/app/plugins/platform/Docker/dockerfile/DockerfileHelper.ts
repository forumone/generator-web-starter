import { Dockerfile } from 'dockerfilejs';
import { posix } from 'path';

import { composerImage, composerTag, gessoImage, gessoTag } from './constants';

const composerInstallStageName = 'composer';
const composerDevStageName = 'composer-dev'
const gessoBuildStageName = 'gesso';
const gessoCleanStageName = 'gesso-clean';
const gessoDevStageName = 'gesso-dev';

/**
 * Options to pass to the `addComposerInstallStage` method of `DockerfileHelper`.
 */
export interface AddComposerInstallStageOptions {
  /**
   * Optional list of directories to copy into the stage before running `composer install`.
   * This is intended to support post-install scripts and similar.
   */
  directories?: ReadonlyArray<string>;

  /**
   * Optional root directory to create. This supports cases where some dependencies are
   * installed inside the web root. By creating it instead of copying, we avoid unneeded
   * copying and maximize usage of the Docker layer cache.
   */
  installRoot?: string;

  /**
   * Post-install commands to run, such as `composer drupal:scaffold`.
   */
  postInstall?: ReadonlyArray<string>;
}

/**
 * Options to pass to the `addFinalCopyStage` method of `DockerfileHelper`.
 */
export interface AddFinalCopyStageOptions {
  /**
   * Paths to copy from the build stage. This requires that a stage named `deps` exists
   * (see `addComposerInstallStage`).
   */
  buildDirectories?: ReadonlyArray<string>;

  /**
   * Path to the Gesso theme. This requires that a stage named `gesso` exists (see
   * `addGessoBuildStage`). When left `undefined`, no Gesso files are copied into the
   * image.
   */
  gessoPath?: string;

  /**
   * Paths to copy from the build context (i.e., the source directory). Directories here
   * are copied after `buildDirectories`.
   */
  sourceDirectories?: ReadonlyArray<string>;

  /**
   * Paths to copy from the build context. Files here are copied directly into the root
   * of the image. These copies are performed last, as it is presumed that they change the
   * least.
   */
  sourceFiles?: ReadonlyArray<string>;
}

/**
 * Helper class with pre-canned Dockerfile stanzas common to all project types.
 */
class DockerfileHelper extends Dockerfile {
  /**
   * Optionally adds memcached to a stage's build. This method is written like so in
   * order to facilitate chaining with images that have multiple stages:
   *
   * ```ts
   * const file = new DockerfileHelper()
   *  .from('forumone/drupal8:xdebug')
   *  .addMemcachedInstall(needsMemcached)
   *  .stage()
   *  .from('forumone/drupal8:latest')
   *  .addMemcachedInstall(needsMemcached)
   *  .render();
   * ```
   *
   * @param needsMemcached If memcached is required
   */
  addMemcachedInstall(needsMemcached: boolean): this {
    if (needsMemcached) {
      this.run('f1-ext-install pecl:memcached');
    }

    return this;
  }

  /**
   * Add instructions necessary to perform a Gesso theme build. As a side effect, this
   * method creates a three new build stages:
   * * `gesso`: Installs production dependencies and builds Gesso.
   * * `gesso-clean`: Removes all unnecessary dependencies for the production image.
   * * `gesso-dev`: Adds all dev dependencies for the test image.
   *
   * Ensure you're finished with the current stage before calling this method.
   *
   * @param sourcePath The path to the Gesso theme (e.g., `web/themes/gesso`)
   */
  addGessoBuildStage(sourcePath: string): this {
    return this.stage()
      // Create the initial gesso installation stage for production dependencies.
      .from({
        image: gessoImage,
        tag: gessoTag,
        stage: gessoBuildStageName,
      })
      .comment('Install npm dependencies')
      .copy({
        src: posix.join(sourcePath, 'package*.json'),
        dest: './',
      })
      .run('if test -e package-lock.json; then npm ci; else npm i; fi')
      .comment('Copy sources and build')
      .copy({
        src: sourcePath,
        dest: './',
      })
      .run({
        commands: [
          ['set', '-ex'],
          ['gulp', 'build'],
        ],
      })

      // Create the production clean-up stage to remove all dependencies.
      .comment('Use a temporary image to clean dev dependencies for production. This allows')
      .comment('the gesso-dev stage to start with these files in place rather than rebuilding.')
      .stage()
      .from({
        image: gessoBuildStageName,
        stage: gessoCleanStageName,
      })
      .run({
        commands: [
          ['set', '-ex'],
          ['rm', '-rf', 'node_modules'],
        ],
      })

      // Create the dev stage to add all dev dependencies.
      .comment('Install all dev dependencies for the test image.')
      .stage()
      .from({
        image: gessoBuildStageName,
        stage: gessoDevStageName,
      })
      .run({
        commands: [
          ['set', '-ex'],
          ['npm', 'install'],
        ],
      });
  }

  /**
   * Add instructions necessary to install Composer dependencies. As a side effect, this
   * method creates two new build stages:
   * * `composer`: Installs production Composer dependencies.
   * * `composer-dev`: Installs additional Composer dev dependencies.
   *
   * Ensure you're finished with the current stage before calling this method.
   *
   * @param directories A list of directories to be copied into the build stage.
   * @param installRoot An installation directory to ensure is present.
   * @param postInstall Commands to be run after completion of `composer install`.
   */
  addComposerInstallStage({
    directories = [],
    installRoot,
    postInstall,
  }: AddComposerInstallStageOptions): this {

    // Create the Composer stage for installing all production dependencies.
    const stage = this.stage().from({
      image: composerImage,
      tag: composerTag,
      stage: composerInstallStageName,
    });

    for (const dir of directories) {
      stage.copy({
        src: dir,
        dest: dir,
      });
    }

    if (installRoot !== undefined) {
      stage.run({ commands: [['mkdir', '-p', installRoot]] });
    }

    stage.copy({
      src: ['composer.json', 'composer.lock'],
      dest: './',
    });

    const commands: ReadonlyArray<string>[] = [
      ['set', '-ex'],
      ['composer', 'install', '--no-dev', '--optimize-autoloader'],
    ];

    if (postInstall) {
      commands.push(postInstall);
    }

    stage.run({ commands });

    // Create the next stage to install additional dev dependencies.
    this.comment('Install additional dev dependencies for the test image.')
    .stage().from({
      image: composerInstallStageName,
      stage: composerDevStageName,
    })
    .run({
      commands: [
        ['set', '-ex'],
        ['composer', 'install', '--optimize-autoloader'],
      ],
    })

    return this;
  }

  /**
   * Create a stage copying dependencies from other build stages. Depending on the options
   * passed to this method (see `AddFinalCopyStageOptions`), some other methods will need
   * to have been called before this one:
   *
   * * `addComposerInstallStage`, if any built dependencies are to be copied
   * * `addGessoBuildStage`, if Gesso is in use
   *
   * Note that this stage requires a previous stage named `base` to exist, since it's used
   * as the base layer to extend.
   */
  addFinalCopyStage({
    buildDirectories = [],
    gessoPath,
    sourceDirectories = [],
    sourceFiles = [],
  }: AddFinalCopyStageOptions): this {
    const stage = this.stage().from({ image: 'base' });

    for (const dir of buildDirectories) {
      stage.copy({
        from: composerInstallStageName,
        src: posix.join('/app', dir),
        dest: dir,
      });
    }

    if (gessoPath !== undefined) {
      stage.copy({
        from: gessoBuildStageName,
        src: '/app',
        dest: gessoPath,
      });
    }

    for (const dir of sourceDirectories) {
      stage.copy({ src: dir, dest: dir });
    }

    if (sourceFiles.length > 0) {
      stage.copy({ src: sourceFiles, dest: './' });
    }

    return this;
  }
}

export default DockerfileHelper;
