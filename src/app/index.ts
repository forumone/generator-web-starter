import path from 'path';
import slugify from 'slugify';
import validate from 'validate-npm-package-name';
import Generator from 'yeoman-generator';

import CliConfigEditor from './CliConfigEditor';
import discoverModules from './discoverModules';
import IgnoreEditor from './IgnoreEditor';

class WebStarter extends Generator {
  private cliConfigEditor = new CliConfigEditor();
  private gitignoreEditor = new IgnoreEditor();
  private name!: string;

  async prompting() {
    const platformDirectory = path.join(__dirname, 'plugins/platform');
    const platforms = await discoverModules(platformDirectory);

    const answers = await this.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name',
        default: slugify(this.appname),
        store: true,
        validate: (name: string) =>
          name !== '' && validate(name.toLowerCase()).validForNewPackages,
      },
      {
        type: 'list',
        name: 'platform',
        message: 'Platform',
        choices: platforms,
        store: true,
      },
    ]);

    this.name = answers.name;

    this.composeWith(
      require.resolve(path.join(platformDirectory, answers.platform)),
      {
        cliConfigEditor: this.cliConfigEditor,
        gitignoreEditor: this.gitignoreEditor,
        name: answers.name,
        capistrano: require.resolve('./plugins/Capistrano'),
      },
    );

    this.config.set('projectName', this.name);
  }

  configuring() {
    const editor = this.gitignoreEditor;

    editor.addSection('IDE files', [
      '.buildpath',
      '.project',
      '.settings',
      '.idea',
      '.vscode',
    ]);

    editor.addSection('OS files', ['.DS_Store', 'Thumbs.db']);

    editor.addSection('Node/NPM', ['node_modules']);
  }

  writing() {
    this.fs.write(
      this.destinationPath('.gitignore'),
      this.gitignoreEditor.serialize(),
    );

    this.fs.extendJSON(this.destinationPath('package.json'), {
      name: this.name,
      private: true,
    });

    this.fs.write(
      this.destinationPath('.f1.yml'),
      this.cliConfigEditor.serialize(),
    );
  }
}

// Export assign as Yeoman uses the return value of require() directly
export = WebStarter;
