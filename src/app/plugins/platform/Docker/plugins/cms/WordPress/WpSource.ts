import { posix } from 'path';
import Generator from 'yeoman-generator';

import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';
import SubgeneratorOptions from './SubgeneratorOptions';

class WpSource extends Generator {
  configuring() {
    const { documentRoot, dockerfile } = this.options as SubgeneratorOptions;

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

  async writing() {
    const { documentRoot } = this.options;

    const wpConfigPath = this.destinationPath(
      'services/wordpress',
      documentRoot,
      'wp-config.php',
    );

    if (!this.fs.exists(wpConfigPath)) {
      this.fs.copyTpl(this.templatePath('wp-config.php.ejs'), wpConfigPath, {
        hashes: await getHashes(),
      });
    }

    // Add a wp-cli.yml file to point to the document root
    this.fs.copyTpl(
      this.templatePath('wp-cli-nostarter.yml.ejs'),
      this.destinationPath('services/wordpress/wp-cli.yml'),
      { documentRoot },
    );
  }

  async install() {
    if (!this.options.shouldInstall) {
      return;
    }

    const wpRoot = this.destinationPath(
      'services/wordpress',
      this.options.documentRoot,
    );

    await installWordPressSource(wpRoot);
  }
}

export = WpSource;
