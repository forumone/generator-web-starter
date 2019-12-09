import { Dockerfile } from 'dockerfilejs';

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
  const dockerfile = new Dockerfile();

  dockerfile.from({
    image: 'forumone/drupal8-cli',
    tag,
  });

  if (memcached) {
    dockerfile.run('f1-ext-install pecl:memcached');
  }

  return dockerfile;
}

export default createDrushDockerfile;
