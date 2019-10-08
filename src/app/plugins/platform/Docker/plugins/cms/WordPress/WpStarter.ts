import { posix } from 'path';
import Generator from 'yeoman-generator';

import spawnComposer from '../../../spawnComposer';

import createComposerFile from './createComposerFile';
import SubgeneratorOptions from './SubgeneratorOptions';

class WpStarter extends Generator {
  configuring() {
    const { composeCliEditor, composeEditor, documentRoot, dockerfile } = this
      .options as SubgeneratorOptions;

    composeCliEditor.addComposer('services/wordpress');

    composeEditor.modifyService('wordpress', service => ({
      ...service,
      env_file: './services/wordpress/.env',
    }));

    dockerfile.addComposerStage({
      comment: 'Install dependencies',
      sources: [documentRoot],
    });

    dockerfile
      .stage()
      .from({ image: 'base' })
      .comment('Copy built dependencies into the production image')
      .copy({
        from: 'deps',
        src: [`/app/${documentRoot}`],
        dest: documentRoot,
      });

    if (this.options.useGesso) {
      const themeRoot = posix.join(documentRoot, 'wp-content/themes/gesso');
      dockerfile.copy({ from: 'gesso', src: ['/app'], dest: themeRoot });
    }
  }

  writing() {
    this.fs.extendJSON(
      this.destinationPath('services/wordpress/composer.json'),
      createComposerFile(this.options.documentRoot),
    );

    const dotenvPath = this.destinationPath('services/wordpress/.env');
    if (!this.fs.exists(dotenvPath)) {
      this.fs.copy(this.templatePath('_env'), dotenvPath);
    }
  }

  async install() {
    if (!this.options.shouldInstall) {
      return;
    }

    const wpRoot = this.destinationPath('services/wordpress');
    await spawnComposer(['install'], { cwd: wpRoot });
  }
}

export = WpStarter;
