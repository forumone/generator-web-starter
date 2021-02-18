import Generator from 'yeoman-generator';
import chalk from 'chalk';
import assert from 'assert-plus';

/**
 * Interactively prompt with generator questions or return configured answers.
 *
 * @param prompts
 */
export async function promptOrUninteractive(
  this: Generator,
  prompts: Generator.Questions,
): Promise<Generator.Answers> {
  assert.bool(
    this.options.uninteractive,
    'Expected Boolean uninteractive generator options.',
  );

  let answers: Generator.Answers = {};

  if (!this.options.uninteractive) {
    this.debug('Interactively prompting for options.');
    answers = this.prompt(prompts);
  } else {
    const config = this.config.get('promptValues');

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
