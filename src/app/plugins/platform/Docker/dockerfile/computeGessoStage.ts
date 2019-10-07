import { Dockerfile, From } from 'dockerfilejs';
import { posix } from 'path';

import { Dist } from '../registry/getLatestNodeRelease';

export interface ComputeGessoStageOptions {
  /**
   * Version of node.js to embed in this image.
   */
  node: Dist;

  /**
   * Version of PHP to embed in this image.
   */
  php: string;

  /**
   * Path to the theme. Used when embedding this Gesso stage in a larger Dockerfile.
   */
  themeRoot?: string;

  /**
   * When `true`, indicates that this stage should be used to perform a build of Gesso.
   * Otherwise, the image acts as a builder.
   */
  buildSources: boolean;
}

function computeGessoStage<Builder extends Dockerfile>(
  dockerfile: Builder,
  { node, php, themeRoot = '', buildSources }: ComputeGessoStageOptions,
): Builder {
  // The interpolation in these strings is done at Docker build time, not here.
  /* eslint-disable no-template-curly-in-string */

  const gessoConfigSources = [
    'gulpfile.js',
    'patternlab-config.json',
    '.stylelintignore',
    '.stylelintrc.yml',
  ];

  const from: From = { image: 'php', tag: php };
  if (buildSources) {
    from.stage = 'gesso';
  }

  dockerfile
    .from(from)
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
        ['rm', '${NODE_FILENAME}'],
        ['npm', 'install', '-g', 'gulp-cli'],
      ],
    })
    .comment('Add and install Node dependencies')
    .copy({ src: posix.join(themeRoot, 'package*.json'), dest: './' })
    .run('if test -e package-lock.json; then npm ci; else npm install; fi');

  /* eslint-enable no-template-curly-in-string */

  if (buildSources) {
    dockerfile
      .comment('Copy theme sources and build')
      .copy({ src: themeRoot, dest: './' })
      .run({
        commands: [
          ['set', '-ex'],
          ['gulp', 'gessoBuild'],
          ['rm', '-rf', 'node_modules'],
        ],
      });
  } else {
    dockerfile.comment('Copy config files').copy({
      src: gessoConfigSources.map(source => posix.join(themeRoot, source)),
      dest: './',
    });
  }

  return dockerfile;
}

export default computeGessoStage;
