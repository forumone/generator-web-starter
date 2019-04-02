// Helper class for ignore-style files (gitignore, dockerignore, etc.)
class IgnoreEditor {
  private readonly lines: string[] = [];

  addEntry(entry: string) {
    this.lines.push(entry);
  }

  addComment(comment: string) {
    this.addEntry('# ' + comment);
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

  serialize() {
    return this.lines.join('\n') + '\n';
  }
}

export default IgnoreEditor;
