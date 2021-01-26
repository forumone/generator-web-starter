import Drupal8 from '.';
import createDebugger from 'debug';
import spawnComposer from '../../../spawnComposer';

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
      'Remove extraneous files from the project template in %s.',
      this.serviceDirectory,
    );
    this.removeExtraneousFiles();

    this.debug(
      'Adding additional Composer dependencies in %s.',
      this.serviceDirectory,
    );
    await this.addComposerDependencies();
  }

  /**
   * Remove files unused in Forum One project structure.
   *
   * The Pantheon composer project adds a lot of extra files for various forms of
   * automation that Forum One doesn't use. To keep the repository content more
   * targeted, these files may be removed.
   */
  private removeExtraneousFiles(): void {
    const generator = this.generator;

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
    for (const file of filesToRemove) {
      const filePath = `${this.serviceDirectory}/${file}`;
      if (generator.existsDestination(filePath)) {
        this.debug('Removing extra Pantheon file %s.', filePath);
        generator.deleteDestination(filePath);
      }
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
}

export default PostInstallPantheon;
