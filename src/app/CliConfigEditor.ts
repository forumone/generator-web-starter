import YAML from 'yaml';

interface Composer {
  project?: string;
}

class CliConfigEditor {
  private composer: Composer | undefined;

  setComposerProject(project: string) {
    this.composer = { project };
  }

  serialize() {
    const document = { version: 1 };

    const composer = this.composer;
    if (composer) {
      return YAML.stringify({ ...document, composer });
    }

    return YAML.stringify(document);
  }
}

export default CliConfigEditor;
