import { gessoWordPressPath } from './constants';
import createGessoGenerator from './createGessoGenerator';

const GessoWordPress = createGessoGenerator({
  git: {
    branch: '4.x',
    repository: 'gesso-wp',
  },
  installPhase: 'install',
  serviceName: 'wordpress',
  themeDirectory: gessoWordPressPath,
});

export = GessoWordPress;
