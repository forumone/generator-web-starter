import { Dockerfile } from 'dockerfilejs';

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
  const dockerfile = new Dockerfile();

  dockerfile.from({
    image: 'forumone/drupal8',
    tag: `${tag}-xdebug`,
    stage: 'dev',
  });

  if (memcached) {
    dockerfile.run('f1-ext-install pecl:memcached');
  }

  dockerfile.stage().from({
    image: 'forumone/drupal8',
    tag,
  });

  if (memcached) {
    dockerfile.run('f1-ext-install pecl:memcached');
  }

  return dockerfile;
}

export default createDrupalDockerfile;
