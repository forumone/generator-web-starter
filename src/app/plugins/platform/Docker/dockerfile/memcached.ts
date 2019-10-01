import Dependency from './Dependency';

const memcached: Dependency = {
  packages: ['libmemcached-dev', 'zlib-dev', 'libevent-dev'],
  pecl: ['memcached'],
};

export default memcached;
