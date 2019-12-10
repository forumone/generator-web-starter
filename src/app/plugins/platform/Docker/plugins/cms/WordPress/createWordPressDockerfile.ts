import DockerfileHelper from '../../../dockerfile/DockerfileHelper';

export interface CreateWordPressDockerfileOptions {
  /**
   * Which PHP tag to use (e.g., `7.4`)
   */
  tag: string;

  /**
   * Whether or not to include the Memcached PECL extension.
   */
  memcached: boolean;
}

function createWordPressDockerfile({
  tag,
  memcached,
}: CreateWordPressDockerfileOptions) {
  return new DockerfileHelper()
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
    })
    .addMemcachedInstall(memcached);
}

export default createWordPressDockerfile;
