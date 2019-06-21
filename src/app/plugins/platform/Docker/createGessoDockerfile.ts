import { Dockerfile } from 'dockerfilejs';
import semver from 'semver';

import { Dist } from './registry/getLatestNodeRelease';

export interface CreateGessoDockerfileOptions {
  node: Dist;
  php: string;
}

function createGessoDockerfile({
  node,
  php,
}: CreateGessoDockerfileOptions): Dockerfile {
  // The interpolation in these strings is done in Docker, not
  // tslint:disable: no-invalid-template-strings

  // Assert this is non-null because node.js follows semver for its releases
  const nodeVersion = semver.parse(node.version)!;

  return new Dockerfile()
    .from({ image: 'node', tag: String(nodeVersion.major), stage: 'build' })
    .workdir('/app')
    .comment('Install dependencies')
    .copy({ src: 'package*.json', dest: './' })
    .run('if test -e package-lock.json; then npm ci; else npm install; fi')
    .stage()
    .from({ image: 'php', tag: php })
    .workdir('/app')
    .comment('Add node.js to a PHP environment for Pattern Lab')
    .env({
      NODE_VERSION: node.version,
      NODE_CHECKSUM: node.checksum,
    })
    .env({
      // Do this in a separate line or else Docker doesn't interpolate NODE_VERSION
      // correctly.
      NODE_FILENAME: 'node-${NODE_VERSION}-linux-x64.tar.gz',
    })
    .run({
      commands: [
        ['set', '-ex'],
        ['cd', '/tmp'],

        [
          'curl',
          'https://nodejs.org/dist/${NODE_VERSION}/${NODE_FILENAME}',
          '-o',
          '${NODE_FILENAME}',
        ],
        'echo "${NODE_CHECKSUM}  ${NODE_FILENAME}" | sha256sum -c',
        [
          'tar',
          '--strip-components=1',
          '-xzf',
          '${NODE_FILENAME}',
          '-C',
          '/usr/local',
        ],
        ['npm', 'install', '-g', 'gulp-cli'],
      ],
    })
    .comment('Add Node modules and copy configuration')
    .copy({ from: 'build', src: '/app/node_modules', dest: './node_modules' })
    .copy({
      src: ['gulpfile.js', 'package*.json', 'patternlab-config.json'],
      dest: './',
    });

  // tslint:enable: no-invalid-template-strings
}

export default createGessoDockerfile;
