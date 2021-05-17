import assert from 'assert-plus';
import chalk from 'chalk';
import Generator from 'yeoman-generator';
import { error, info, subcommand, success, warning } from './log';

/**
 * A base generator for Web Starter generators to extend.
 *
 * This generator defines common functionality to be shared by all
 * generators.
 */
export class WSGenerator extends Generator {
  // Bind logger helper functions.
  public info = info.bind(this);
  public subcommand = subcommand.bind(this);
  public success = success.bind(this);
  public warning = warning.bind(this);
  public error = error.bind(this);

  public constructor(
    args: string | string[],
    opts: Generator.GeneratorOptions,
  ) {
    super(args, opts);
  }

  /**
   * Interactively prompt with generator questions or return configured answers.
   *
   * @param prompts Prompts to be displayed or loaded from configuration.
   */
  public async promptOrUninteractive(
    prompts: Generator.Questions,
  ): Promise<Generator.Answers> {
    assert.bool(
      this.options.uninteractive,
      'Expected Boolean uninteractive generator options.',
    );

    const generatorName = this.constructor.name;
    let answers: Generator.Answers = {};

    if (!this.options.uninteractive) {
      this.debug(
        chalk`Interactively prompting for options in the {bold %s} generator.`,
        generatorName,
      );
      answers = this.prompt(prompts);
    } else {
      const config = this.config.get('promptValues');
      this.info(
        chalk`Assuming cached values for uninteractive execution of the {bold %s} generator.`,
        generatorName,
      );

      // Log assumed prompt responses for debugging.
      for (const prompt of Object.values(prompts)) {
        const cachedValue = config[prompt.name];
        this.debug(
          chalk`Assuming uninteractive value for {bold '%s'}: {bold.green %s}`,
          prompt.name,
          cachedValue,
        );
        answers[prompt.name] = cachedValue;
      }
    }

    return answers;
  }
}
