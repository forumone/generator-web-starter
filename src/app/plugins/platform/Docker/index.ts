import assert from 'assert-plus';
import dedent from 'dedent';
import path from 'path';
import Generator from 'yeoman-generator';

import discoverModules from '../../../discoverModules';
import IgnoreEditor from '../../../IgnoreEditor';

import ComposeEditor from './ComposeEditor';

const cmsAnswerKey = 'dockerCms';
const searchAnswerKey = 'dockerSearch';
const cacheAnswerKey = 'dockerCache';

const composeIntro = dedent`
  # This is the Docker Compose entry point for this project.
  # Services listed in this file will automatically be built and started when you bring
  # the project up.
`;

const cliIntro = dedent`
  # This is the Compose file for command-line services.
  # Anything that doesn't need to be run as part of the main \`docker-compose up'
  # command should reside in here and be invoked by a helper script.
`;

const overrideIntro = dedent`
  # This is your override file. Changes to it won't be tracked in source control.
  # Use this file to temporarily customize services (e.g., to expose new ports).
`;

class Docker extends Generator {
  private readonly editor = new ComposeEditor({ intro: composeIntro });
  private readonly cliEditor = new ComposeEditor({ intro: cliIntro });

  initializing() {
    const options = this.options;
    assert.string(options.name, 'options.name');
    assert.string(options.capistrano, 'options.capistrano');
  }

  async prompting() {
    const pluginDirectory = path.join(__dirname, 'plugins');

    const cmsPluginDirectory = path.join(pluginDirectory, 'cms');
    const cmsPlugins = await discoverModules(cmsPluginDirectory);

    const searchPluginDirectory = path.join(pluginDirectory, 'search');
    const searchPlugins = await discoverModules(searchPluginDirectory);

    const cachePluginDirectory = path.join(pluginDirectory, 'cache');
    const cachePlugins = await discoverModules(cachePluginDirectory);

    const answers = await this.prompt([
      {
        type: 'list',
        name: cmsAnswerKey,
        choices: [...cmsPlugins, 'None'],
        message: 'Which CMS will this project use?',
        store: true,
      },
      {
        type: 'list',
        name: searchAnswerKey,
        choices: [...searchPlugins, 'None'],
        message: 'Which search system will this project use?',
        store: true,
      },
      {
        type: 'list',
        name: cacheAnswerKey,
        choices: [...cachePlugins, 'None'],
        message: 'What caching layer will this project use?',
        store: true,
      },
    ]);

    const {
      [cmsAnswerKey]: cmsType,
      [searchAnswerKey]: searchType,
      [cacheAnswerKey]: cacheType,
    } = answers;

    const composedGeneratorOptions = {
      cliConfigEditor: this.options.cliConfigEditor,
      composeEditor: this.editor,
      composeCliEditor: this.cliEditor,
      plugins: {
        cms: cmsType,
        search: searchType,
        cache: cacheType,
      },
    };

    if (cmsType !== 'None') {
      const pluginPath = path.join(cmsPluginDirectory, cmsType);

      this.composeWith(require.resolve(pluginPath), {
        name: this.options.name,
        capistrano: this.options.capistrano,
        ...composedGeneratorOptions,
      });
    }

    if (searchType !== 'None') {
      const pluginPath = path.join(searchPluginDirectory, searchType);

      this.composeWith(require.resolve(pluginPath), composedGeneratorOptions);
    }

    if (cacheType !== 'None') {
      const pluginPath = path.join(cachePluginDirectory, cacheType);

      this.composeWith(require.resolve(pluginPath), composedGeneratorOptions);
    }
  }

  configuring() {
    const editor = this.options.gitignoreEditor as IgnoreEditor;
    editor.addSection('Docker Compose overrides', [
      'docker-compose.override.yml',
    ]);
  }

  writing() {
    this.fs.write(
      this.destinationPath('docker-compose.yml'),
      this.editor.serialize(),
    );

    this.fs.write(
      this.destinationPath('docker-compose.cli.yml'),
      this.cliEditor.serialize(),
    );

    // Only create the override file on initial scaffold: it's not tracked in source
    // control by default, so the user can't safely revert if they accidentally allow
    // Yeoman to overwrite the file.
    const overrideFilePath = this.destinationPath(
      'docker-compose.override.yml',
    );

    if (!this.fs.exists(overrideFilePath)) {
      this.fs.write(
        overrideFilePath,
        new ComposeEditor({ intro: overrideIntro }).serialize(),
      );
    }
  }
}

export = Docker;
