import { posix } from 'path';

export interface Repository {
  readonly type: string;
  readonly url: string;
}

export interface Require {
  readonly [pkg: string]: string;
}

export interface Config {
  readonly 'vendor-dir': string;
}

const runWPStarterSetup = 'WCM\\WPStarter\\Setup::run';

export interface Scripts {
  readonly 'post-install-cmd': typeof runWPStarterSetup;
  readonly 'post-update-cmd': typeof runWPStarterSetup;
  readonly [script: string]: string;
}

export interface WPStarterExtra {
  readonly 'prevent-overwrite': ReadonlyArray<string>;
}

export interface InstallerPaths {
  readonly [pathTemplate: string]: ReadonlyArray<string>;
}

export interface Extra {
  readonly 'wordpress-install-dir': string;
  readonly 'wordpress-content-dir': string;
  readonly wpstarter: WPStarterExtra;
  readonly 'installer-paths': InstallerPaths;
}

export interface ComposerFile {
  readonly name: string;
  readonly description?: string;
  readonly type: 'project';
  readonly repositories: ReadonlyArray<Repository>;
  readonly require: Require;
  readonly config: Config;
  readonly scripts: Scripts;
  readonly extra: Extra;
}

function createComposerFile(name: string, documentRoot: string): ComposerFile {
  const vendorDirectory = posix.join(documentRoot, 'wp-content/vendor');

  const installDirectory = posix.join(documentRoot, 'wp');
  const contentDirectory = posix.join(documentRoot, 'wp-content');

  const configFilePath = posix.join(documentRoot, 'wp-config.php');
  const indexFilePath = posix.join(documentRoot, 'index.php');

  function createInstallerPath(path: string, type: string): InstallerPaths {
    const key = posix.join(documentRoot, 'wp-content', path, '{$name}');
    const value = [`type: ${type}`];

    return { [key]: value };
  }

  return {
    name,
    type: 'project',
    repositories: [{ type: 'composer', url: 'https://wpackagist.org' }],
    require: {
      'wecodemore/wpstarter': '~2.0',
    },
    config: {
      'vendor-dir': vendorDirectory,
    },
    scripts: {
      'post-install-cmd': runWPStarterSetup,
      'post-update-cmd': runWPStarterSetup,
    },
    extra: {
      'wordpress-install-dir': installDirectory,
      'wordpress-content-dir': contentDirectory,
      wpstarter: {
        'prevent-overwrite': ['.gitignore', configFilePath, indexFilePath],
      },
      'installer-paths': {
        ...createInstallerPath('plugins', 'wordpress-plugin'),
        ...createInstallerPath('mu-plugins', 'wordpress-muplugin'),
        ...createInstallerPath('themes', 'wordpress-theme'),
      },
    },
  };
}

export default createComposerFile;
