import { posix } from 'path';

const comment = /^#/;
const negated = /^!/;

/**
 * Is this ignore line a comment?
 */
function isComment(entry: string) {
  return comment.test(entry);
}

/**
 * Is this ignore line a non-comment and non-blank entry?
 */
function isEntry(entry: string) {
  return entry !== '' && !isComment(entry);
}

/**
 * Is this a negated ignore entry?
 */
function isNegated(entry: string) {
  return negated.test(entry);
}

/**
 * Type for entry transformation functions.
 */
export type Transformer = (line: string) => string;

/**
 * Given a base path, return a function that transforms ignore entries. The returned
 * transformer is smart enough to know not to remap comments or blank lines, and knows
 * about negated entries.
 *
 * @param base The base path to use when remapping entries.
 */
function createTransformer(base: string): Transformer {
  // Transforms a non-negated entry.
  function transformEntry(entry: string) {
    return posix.join(base, entry);
  }

  // Transforms negated entries.
  function transformNegatedEntry(entry: string) {
    const path = entry.slice(1);

    return `!${transformEntry(path)}`;
  }

  return line => {
    const entry = line.trim();

    if (!isEntry(entry)) {
      return entry;
    }

    const transform = isNegated(entry) ? transformNegatedEntry : transformEntry;
    return transform(entry);
  };
}

export default createTransformer;
