import { Dockerfile } from 'dockerfilejs';

import { composerImage, composerTag } from './composer';
import computeBuildStage, {
  ComputeBuildStageOptions,
} from './computeBuildStage';
import computeGessoStage, {
  ComputeGessoStageOptions,
} from './computeGessoStage';

/**
 * Helper interface for options that add comments.
 */
interface CommentOptions {
  /**
   * Optional comment.
   */
  comment?: string;
}

/**
 * Options to add a build stage (with comments) to a Dockerfile.
 */
export interface BuildStageHelperOptions
  extends ComputeBuildStageOptions,
    CommentOptions {}

/**
 * Options for the `addComposerStage()` method of `DockerfileHelper`.
 */
export interface AddComposerStageOptions extends CommentOptions {
  /**
   * The name of this stage. Defaults to `deps`.
   */
  name?: string;

  /**
   * The names of any files or directories that need to be copied before
   * `composer install` can be run. This must include the directory into which modules
   * are installed (i.e., the Drupal or WP web roots).
   */
  sources: ReadonlyArray<string>;
}

/**
 * Options for the `addGessoStage()` method of `DockerfileHelper`.
 */
export interface AddGessoStageOptions
  extends ComputeGessoStageOptions,
    CommentOptions {}

/**
 * Class for canned Dockerfile stages.
 */
class DockerfileHelper extends Dockerfile {
  /**
   * Creates a Dockerfile containing a base stage that is built using `computeBuildStage`.
   *
   * @param options Options for this stage (including comment)
   */
  static fromBuildStage(options: BuildStageHelperOptions) {
    const { comment, ...stageOptions } = options;

    const dockerfile = new this();
    if (comment) {
      dockerfile.comment(comment);
    }

    return computeBuildStage(dockerfile, stageOptions);
  }

  /**
   * Creates a Dockerfile containing a Gesso build.
   */
  static gesso(options: ComputeGessoStageOptions) {
    return computeGessoStage(new this(), options);
  }

  /**
   * Adds a build stage (see `computeBuildStage()`) to this Dockerfile.
   *
   * @param options Options for this stage (including comment)
   */
  addBuildStage(options: BuildStageHelperOptions): this {
    const { comment, ...stageOptions } = options;
    const stage = this.stage();

    if (comment) {
      stage.comment(comment);
    }

    return computeBuildStage(stage, stageOptions);
  }

  /**
   * Adds a Composer install stage to this Dockerfile.
   */
  addComposerStage({
    comment,
    name = 'deps',
    sources,
  }: AddComposerStageOptions): this {
    const stage = this.stage();

    if (comment) {
      stage.comment(comment);
    }

    stage
      .from({ image: composerImage, tag: composerTag, stage: name })
      .run('composer global require hirak/prestissimo');

    for (const source of sources) {
      stage.copy({ src: [source], dest: source });
    }

    stage
      .copy({ src: ['composer.json', 'composer.lock'], dest: './' })
      .run('composer install --no-dev --optimize-autoloader');

    return this;
  }

  /**
   * Adds a Gesso build stage to this Dockerfile.
   */
  addGessoStage({ comment, ...stageOptions }: AddGessoStageOptions): this {
    const stage = this.stage();
    if (comment) {
      stage.comment(comment);
    }

    return computeGessoStage(stage, stageOptions);
  }
}

export default DockerfileHelper;
