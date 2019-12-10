import DockerfileHelper from '../../../dockerfile/DockerfileHelper';

export interface CreateDrupalDockerfileOptions {
  /**
   * Which PHP tag to use (e.g., `7.4`)
   */
  tag: string;

  /**
   * Whether or not to include the Memcached PECL extension.
   */
  memcached: boolean;
}

function createDrupalDockerfile({
  tag,
  memcached,
}: CreateDrupalDockerfileOptions) {
  return new DockerfileHelper()
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
    })
    .addMemcachedInstall(memcached);
}

export default createDrupalDockerfile;
