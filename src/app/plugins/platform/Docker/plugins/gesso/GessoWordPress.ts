import createGessoGenerator from './createGessoGenerator';

const GessoWordPress = createGessoGenerator({
  git: {
    branch: '2.x',
    repository: 'gesso-wp',
  },
  installPhase: 'install',
  serviceName: 'wordpress',
  themeDirectory: 'wp-content/themes',
});

export = GessoWordPress;
