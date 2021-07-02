import DockerfileHelper from '../../../dockerfile/DockerfileHelper';

export interface CreateDrushDockerfileOptions {
  /**
   * Which PHP tag to use (e.g., `7.4`)
   */
  tag: string;

  /**
   * Whether or not to include the Memcached PECL extension.
   */
  memcached: boolean;
}

function createDrushDockerfile({
  tag,
  memcached,
}: CreateDrushDockerfileOptions) {
  return new DockerfileHelper()
    .from({
      image: 'forumone/drupal8-cli',
      tag,
    })
    .addMemcachedInstall(memcached);
}

export default createDrushDockerfile;
