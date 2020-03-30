import DockerfileHelper from '../../../dockerfile/DockerfileHelper';

export interface CreateWordPressCliDockerfileOptions {
  /**
   * Which PHP tag to use (e.g., `7.4`)
   */
  tag: string;

  /**
   * Whether or not to include the Memcached PECL extension.
   */
  memcached: boolean;
}

function createWordPressCliDockerfile({
  tag,
  memcached,
}: CreateWordPressCliDockerfileOptions) {
  return new DockerfileHelper()
    .from({
      image: 'forumone/wordpress-cli',
      tag,
    })
    .addMemcachedInstall(memcached);
}

export default createWordPressCliDockerfile;
