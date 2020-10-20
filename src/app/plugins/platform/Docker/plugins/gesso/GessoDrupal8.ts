import createGessoGenerator from './createGessoGenerator';
import { gessoDrupalPath } from './constants';

const GessoDrupal8 = createGessoGenerator({
  git: {
    branch: '4.x',
    repository: 'gesso',
  },
  // See comments in the Drupal8 generator for why this uses the 'default' phase instead
  // of the more appropriate 'install' phase.
  installPhase: 'default',
  serviceName: 'drupal',
  themeDirectory: gessoDrupalPath,
});

export = GessoDrupal8;
