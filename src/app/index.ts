import path from 'path';
import slugify from 'slugify';
import validate from 'validate-npm-package-name';
import Generator from 'yeoman-generator';

import discoverModules from './discoverModules';
import IgnoreEditor from './IgnoreEditor';
import { promptOrUninteractive } from '../util';

class WebStarter extends Generator {
  private gitignoreEditor = new IgnoreEditor();
  private name!: string;

  public constructor(
    args: string | string[],
    opts: Generator.GeneratorOptions,
  ) {
    super(args, opts);

    this.option('uninteractive', {
      type: Boolean,
      default: false,
      description: 'Prevent all prompts and use saved answers.',
    });
  }

  async prompting() {
    const platformDirectory = path.join(__dirname, 'plugins/platform');
    const platforms = await discoverModules(platformDirectory);

    const { name, platform } = await promptOrUninteractive.call(this, [
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

    this.name = name;

    this.composeWith(require.resolve(path.join(platformDirectory, platform)), {
      // cliConfigEditor: this.cliConfigEditor,
      gitignoreEditor: this.gitignoreEditor,
      name,
      capistrano: require.resolve('./plugins/Capistrano'),
      uninteractive: this.options.uninteractive,
    });

    this.config.set('projectName', name);
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
  }
}

// Export assign as Yeoman uses the return value of require() directly
export = WebStarter;
