import { Dockerfile } from 'dockerfilejs';

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
}

export default DockerfileHelper;
