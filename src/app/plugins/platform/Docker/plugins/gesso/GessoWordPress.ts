import createGessoGenerator from './createGessoGenerator';

const GessoWordPress = createGessoGenerator({
  extraBindMounts: ['alter-twig.php'],
  git: {
    branch: '3.x',
    repository: 'gesso-wp',
  },
  installPhase: 'install',
  serviceName: 'wordpress',
  themeDirectory: 'wp-content/themes',
});

export = GessoWordPress;
