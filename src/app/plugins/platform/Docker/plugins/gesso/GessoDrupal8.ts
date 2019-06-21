import createGessoGenerator from './createGessoGenerator';

const GessoDrupal8 = createGessoGenerator({
  git: {
    branch: '8.x-3.x',
    repository: 'gesso',
  },
  // See comments in the Drupal8 generator for why this uses the 'default' phase instead
  // of the more appropriate 'install' phase.
  installPhase: 'default',
  serviceName: 'drupal',
  themeDirectory: 'themes',
});

export = GessoDrupal8;
