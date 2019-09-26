import Dependency from './Dependency';

const gd: Dependency = {
  builtins: ['gd'],
  configureArgs: [
    'gd',
    '--with-freetype-dir=/usr/include/',
    '--with-jpeg-dir=/usr/include/',
    '--with-png-dir=/usr/include/',
  ],
  packages: ['coreutils', 'freetype-dev', 'libjpeg-turbo-dev'],
};

export default gd;
