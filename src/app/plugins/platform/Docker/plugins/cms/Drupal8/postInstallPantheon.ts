import Drupal8 from '.';
import createDebugger from 'debug';
import spawnComposer from '../../../spawnComposer';
import rimraf from 'rimraf';

class PostInstallPantheon {
  private namespace =
    'web-starter:app:plugins:platform:Docker:plugins:cms:Drupal8:postInstallPantheon';
  private serviceDirectory = 'services/drupal';
  private generator: Drupal8;
  private debug: createDebugger.Debugger;

  constructor(generator: Drupal8) {
    this.generator = generator;
    this.debug = createDebugger(this.namespace);
  }

  /**
   * Run all customizations for the Pantheon composer template.
   */
  public async customizePantheonInstall(): Promise<void> {
    this.debug(
      'Adding additional Composer dependencies in %s.',
      this.serviceDirectory,
    );
    await this.addComposerDependencies();

    this.debug('Configuring .env file support.');
    await this.addEnvSupport();

    this.debug(
      'Removing extraneous files from the project template in %s.',
      this.serviceDirectory,
    );
    await this.removeExtraneousFiles();
  }

  /**
   * Remove files unused in Forum One project structure.
   *
   * The Pantheon composer project adds a lot of extra files for various forms of
   * automation that Forum One doesn't use. To keep the repository content more
   * targeted, these files may be removed.
   */
  private async removeExtraneousFiles(): Promise<void> {
    // Files relative to the Drupal directory to be removed.
    const filesToRemove = [
      'scripts/github',
      'scripts/gitlab',
      '.circleci',
      'bitbucket-pipelines.yml',
      'build-providers.json',
      '.gitlab-ci.yml',
      '.travis.yml',
    ];

    // Remove each file from the destination if it exists.
    // nb. The files have to be removed directly from the filesystem instead of
    //   using the mem-fs management commands provided by the generator since
    //   the Composer command is creating them as raw files and any changes to them
    //   in mem-fs results in conflicts to be resolved when the generator attempts
    //   to apply the changes.
    //   Since the `composer create-project` command runs outside of the scope of
    //   the mem-fs store after it's created, the store is unaware they exist and
    //   only marks them as deleted files which results in conflics on file commit.
    for (const filePath of filesToRemove) {
      const relativePath = `${this.serviceDirectory}/${filePath}`;

      await rimraf(this.generator.destinationPath(relativePath), err => {
        if (err !== null) {
          throw err;
        }
      });
    }
  }

  /**
   * Add any additional Composer dependencies that may be needed.
   */
  private async addComposerDependencies() {
    const composerDependencies = [
      'kalamuna/quicksilver-deploy-tools',
      'vlucas/phpdotenv',
    ];

    this.debug(
      'Adding Composer dependencies: %s',
      composerDependencies.join(', '),
    );
    await spawnComposer(
      [
        'require',
        ...composerDependencies,
        '--ignore-platform-reqs',
        '--no-scripts',
        '--no-install',
      ],
      {
        cwd: this.generator.destinationPath(this.serviceDirectory),
      },
    );
  }

  /**
   * Add necessary configuration to support .env file usage.
   */
  private async addEnvSupport(): Promise<void> {
    const generator = this.generator;

    // Add the `load.environment.php` file.
    const loadFilePath = `${this.serviceDirectory}/load.environment.php`;
    this.debug('Copying load.environment.php template to %s.', loadFilePath);
    this.generator.copyTemplate(
      generator.templatePath('load.environment.php'),
      generator.destinationPath(loadFilePath),
    );

    // TODO: Add `composer.json` autoload configuration.
}

export default PostInstallPantheon;
