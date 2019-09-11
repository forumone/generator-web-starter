import assert from 'assert-plus';
import dedent from 'dedent';
import fs from 'fs';
import { promisify } from 'util';
import Generator from 'yeoman-generator';

import IgnoreEditor from '../../../IgnoreEditor';

const readFile = promisify(fs.readFile);

class JavaScript extends Generator {
  initializing() {
    const options = this.options;
    assert.object(options.gitignoreEditor, 'options.gitignoreEditor');
    assert.string(options.capistrano, 'options.capistrano');
  }

  async prompting() {
    const { useCapistrano } = await this.prompt([
      {
        type: 'confirm',
        name: 'useCapistrano',
        message: 'Deploy with Capistrano?',
        default: true,
        store: true,
      },
    ]);

    if (useCapistrano) {
      this.composeWith(this.options.capistrano, {
        platform: 'html',
        name: this.options.name,
        webroot: 'public',
        appWebroot: 'public',
      });
    }
  }

  configuring() {
    const editor = this.options.gitignoreEditor as IgnoreEditor;
    editor.addSection('Webpack', ['/public']);
  }

  private _copyFile(source: string, target = source) {
    this.fs.copy(this.templatePath(source), this.destinationPath(target));
  }

  writing() {
    this._copyFile('_editorconfig', '.editorconfig');
    this._copyFile('_prettierrc', '.prettierrc');
    this._copyFile('babel.config.js');
    this._copyFile('_eslint.js', '.eslint.js');
    this._copyFile('tsconfig.json');
    this._copyFile('webpack.config.js');
    this._copyFile('src');
    this._copyFile('gulpfile.js');
    this._copyFile('tasks');

    this.fs.extendJSON(this.destinationPath('package.json'), {
      scripts: {
        start: 'gulp',
        build: 'gulp build',
      },
    });
  }

  private _installToolchain() {
    // Webpack, asset loaders, and basic plugins
    this.npmInstall(
      [
        'webpack',
        'webpack-dev-server',
        'webpack-cli',
        'file-loader',
        'html-webpack-plugin',
        'clean-webpack-plugin',
        'terser-webpack-plugin',
        'optimize-css-assets-webpack-plugin',
      ],
      { 'save-dev': true },
    );

    // Install TypeScript and tslib with exact versions to avoid potential breaking changes
    this.npmInstall(['typescript', 'tslib'], {
      'save-dev': true,
      'save-exact': true,
    });

    // TypeScript tooling
    this.npmInstall(
      [
        'ts-loader',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/eslint-plugin-tslint',
        '@typescript-eslint/parser',
        'eslint',
        'eslint-config-prettier',
        'eslint-plugin-implicit-dependencies',
        'eslint-plugin-prettier',
        'prettier',
        'fork-ts-checker-webpack-plugin',
        'eslint-loader'
      ],
      { 'save-dev': true },
    );

    // Babel (React) tooling
    this.npmInstall(['babel-loader', '@babel/core', '@babel/preset-react'], {
      'save-dev': true,
    });

    // Sass compilation and plugins
    this.npmInstall(
      [
        'node-sass',
        'sass-loader',
        'import-glob',
        'imagemin-loader',
        'imagemin-pngquant',
        'imagemin-svgo',
        'css-loader',
        'postcss-loader',
        'autoprefixer',
        'extract-css-chunks-webpack-plugin',
      ],
      { 'save-dev': true },
    );

    // Gulp, etc.
    this.npmInstall(['gulp'], { 'save-dev': true });
  }

  private _installDependencies() {
    // It's safe to install these with caret ranges - they adhere to semver fairly closely...
    this.npmInstall(['es6-promise', 'react', 'react-dom'], {
      'save-dev': true,
    });

    // ... however, any change to an @types-scoped package is a patch-level bump, so we should
    // install type definitions with the -E flag to avoid breaking future installations.
    this.npmInstall(['@types/react', '@types/react-dom'], {
      'save-dev': true,
      'save-exact': true,
    });
  }

  async install() {
    // We don't need to catch ENOENT errors here: package.json always exists after the writing
    // phase since the root generator wrote a file with { name, private } in it.
    const packageContents = JSON.parse(
      await readFile(this.destinationPath('package.json'), 'utf-8'),
    );

    // Don't clobber the project's dependencies unless the user asked us to. The choice of
    // 'typescript' as the dev dependency is entirely arbitrary - it's just a sentinel to indicate
    // that we've already called `_installToolchain()' for this project.
    if (
      'devDependencies' in packageContents &&
      'typescript' in packageContents.devDependencies &&
      !this.options.forceInstall
    ) {
      this.log(
        dedent`
          It appears this project is already set up. Refusing to re-run NPM installation.
          (Re-run this generator with --force-install to update NPM anyway.)
        `,
      );
      return;
    }

    this._installToolchain();
    this._installDependencies();
  }
}

export = JavaScript;
