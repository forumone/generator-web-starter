import chalk from 'chalk';
import Generator from 'yeoman-generator';

/**
 * Predefined output color formatters to standardize console output.
 */
export const color = {
  /**
   * Debug output formatter.
   */
  debug: chalk.yellow,

  /**
   * Error output formatter.
   */
  error: chalk.bold.red,

  /**
   * Info output formatter.
   */
  info: chalk.bold.blue,

  /**
   * Subcommand output formatter.
   */
  subcommand: chalk.dim,

  /**
   * Success message output formatter.
   */
  success: chalk.green,

  /**
   * Warning message output formatter.
   */
  warning: chalk.bgRed,
};

/**
 * Log debug output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function debug(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.debug(color.debug(message), ...params);
}

/**
 * Display subcommand output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function subcommand(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.debug(color.subcommand(message), ...params);
}

/**
 * Log informative output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function info(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.log(color.info(message), ...params);
}

/**
 * Log success output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function success(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.log(color.success(message), ...params);
}

/**
 * Log warning output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function warning(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.log(color.warning(message), ...params);
}

/**
 * Log error output with common formatting.
 *
 * @param this The generator context logging should come from.
 * @param message The message formatting string.
 * @param params Any parameters to be loaded into the message.
 */
export function error(
  this: Generator,
  message: string,
  ...params: unknown[]
): void {
  this.log(color.error(message), ...params);
}
