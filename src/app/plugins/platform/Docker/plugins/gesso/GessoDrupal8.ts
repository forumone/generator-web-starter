import createGessoGenerator from './createGessoGenerator';
import { gessoDrupalBranch, gessoDrupalRepository } from './drupal8';

const GessoDrupal8 = createGessoGenerator({
  git: {
    branch: gessoDrupalBranch,
    repository: gessoDrupalRepository,
  },
  // See comments in the Drupal8 generator for why this uses the 'default' phase instead
  // of the more appropriate 'install' phase.
  installPhase: 'default',
  serviceName: 'drupal',
  themeDirectory: 'themes',
});

export = GessoDrupal8;
