import { Dockerfile } from 'dockerfilejs';

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
  const dockerfile = new Dockerfile();

  dockerfile.from({
    image: 'forumone/wordpress-cli',
    tag,
  });

  if (memcached) {
    dockerfile.run('f1-ext-install pecl:memcached');
  }

  return dockerfile;
}

export default createWordPressCliDockerfile;
