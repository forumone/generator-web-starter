import createGessoGenerator from './createGessoGenerator';
import { gessoWordpressBranch, gessoWordpressRepository } from './wordpress';

const GessoWordPress = createGessoGenerator({
  git: {
    branch: gessoWordpressBranch,
    repository: gessoWordpressRepository,
  },
  installPhase: 'install',
  serviceName: 'wordpress',
  themeDirectory: 'wp-content/themes',
});

export = GessoWordPress;
