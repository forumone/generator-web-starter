import Generator from 'yeoman-generator';
import chalk from 'chalk';

/**
 * Interactively prompt with generator questions or return configured answers.
 *
 * @param prompts
 * @param uninteractive
 * @param generator
 */
export async function promptOrUninteractive(
  prompts: Generator.Questions,
  uninteractive: boolean,
  generator: Generator,
): Promise<Generator.Answers> {
  let answers: Generator.Answers = {};

  if (!uninteractive) {
    generator.debug('Interactively prompting for options.');
    answers = await generator.prompt(prompts);
  } else {
    const config = generator.config.get('promptValues');

    // Log assumed prompt responses for debugging.
    for (const prompt of Object.values(prompts)) {
      const cachedValue = config[prompt.name];
      generator.debug(
        chalk`Assuming uninteractive value for {bold '%s'}: {bold.green %s}`,
        prompt.name,
        cachedValue,
      );
      answers[prompt.name] = cachedValue;
    }
  }

  return answers;
}
