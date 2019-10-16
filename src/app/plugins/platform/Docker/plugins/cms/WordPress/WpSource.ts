import { posix } from 'path';
import Generator from 'yeoman-generator';

import getHashes from './getHashes';
import installWordPressSource from './installWordPressSource';
import SubgeneratorOptions from './SubgeneratorOptions';

/**
 * Subgenerator to assist the WordPress CMS plugin. This includes the configuration
 * necessary to install WordPress directly from source - that is, a project that does
 * *not* use Composer.
 *
 * See also: the main `WordPress` generator and this generator's sibling, the `WpStarter` generator.
 */
class WpSource extends Generator {
  configuring() {
    const { composeEditor, documentRoot, dockerfile } = this
      .options as SubgeneratorOptions;

    composeEditor.modifyService('wordpress', service => ({
      ...service,
      // Projects not based on wp-starter won't have a .env file, so we have to
      // ensure a minimally-compatible runtime environment inside the container.
      environment: {
        ...service.environment,
        DB_HOST: 'mysql:3306',
        DB_NAME: 'web',
        DB_USER: 'web',
        DB_PASSWORD: 'web',
        SMTPHOST: 'mailhog:1025',
      },
    }));

    dockerfile
      .stage()
      .from({ image: 'base' })
      .comment('Copy built dependencies into the production image')
      .copy({ src: [documentRoot], dest: documentRoot });

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
