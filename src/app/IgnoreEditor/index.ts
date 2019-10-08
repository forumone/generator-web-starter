import createTransformer from './createTransformer';

/**
 * Options for the `addContentsOfFile()` method on the `IgnoreEditor` class.
 */
export interface AddContentsOfFileOptions {
  /**
   * The heading text to use for the section implicitly created by copying a file.
   */
  heading: string;

  /**
   * The content of the file to copy.
   */
  content: string;

  /**
   * When present, this path is used to "rebase" the ignore entry paths. For example, if
   * `path` is set to `foo/bar`, then the entry `baz` from the file is turned into
   * `foo/bar/baz`. This supports copying nested ignore files (i.e., Gesso) into a root
   * file - the specific use case this covers is `.dockerignore`, since `docker build`
   * does not respect nested ignore files in the same way that Git does.
   */
  path?: string;
}

// Helper class for ignore-style files (gitignore, dockerignore, etc.)
class IgnoreEditor {
  private readonly lines: string[] = [];

  addEntry(entry: string) {
    this.lines.push(entry);
  }

  addComment(comment: string) {
    this.addEntry(`# ${comment}`);
  }

  addSeparator() {
    this.addEntry('');
  }

  addSection(heading: string, entries: string[]) {
    this.addComment(heading);
    for (const entry of entries) {
      this.addEntry(entry);
    }

    this.addSeparator();
  }

  /**
   * Create a new section by copying the entries of an existing ignore file into this editor.
   */
  addContentsOfFile({
    heading,
    content,
    path = '.',
  }: AddContentsOfFileOptions) {
    const entries = content
      .trim()
      .split('\n')
      .map(createTransformer(path));

    this.addSection(heading, entries);
  }

  serialize() {
    return `${this.lines.join('\n')}\n`;
  }
}

export default IgnoreEditor;
