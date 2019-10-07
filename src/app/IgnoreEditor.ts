import { posix } from 'path';

const comment = /^#/;

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
   * Copy the lines of an existing ignore file into this editor. The optional `path`
   * parameter allows using nested ignore files - this situation supports mirroring an
   * ignore file from, say, the theme in a root ignore file for Docker.
   *
   * @param content The string content of an ignore file
   * @param path The path in which to nest these contents
   */
  addContentsOfFile(content: string, path = '.') {
    for (const line of content.split('\n')) {
      const entry = line.trim();
      if (entry && !comment.test(entry)) {
        // Path entry: prefix the path
        this.addEntry(posix.join(path, entry));
      } else {
        // Comment or blank line
        this.addEntry(entry);
      }
    }
  }

  serialize() {
    return `${this.lines.join('\n')}\n`;
  }
}

export default IgnoreEditor;
