import { descending } from 'd3-array';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { promisify } from 'util';
import Generator from 'yeoman-generator';

import ComposeEditor, { createBindMount } from '../../ComposeEditor';
import getImageTags from '../../registry/getImageTags';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

class Solr extends Generator {
  // Assigned during initialization
  private solrTagOptions!: ReadonlyArray<string>;

  // Assigned during prompting
  private solrTag!: string;
  private solrUseConfig: boolean | undefined;

  // Assigned during configuring (when used)
  private configDirectory: string | undefined;

  async initializing() {
    // NB. matches, e.g., "7-alpine" - we assume that for our purposes a major version tag is
    // enough.
    const alpineTag = /^(\d+)-alpine$/;

    const tags = await getImageTags('solr');

    this.solrTagOptions = tags
      .map(tag => {
        const match = alpineTag.exec(tag);

        return match && match[1];
      })
      .filter((tag): tag is string => tag !== null)
      .sort(descending);
  }

  async prompting() {
    const usesDrupal = this.options.plugins.cms === 'Drupal8';

    const { solrTag, solrUseConfig } = await this.prompt([
      {
        name: 'solrTag',
        type: 'list',
        choices: this.solrTagOptions,
        message: 'Choose a Solr version:',
        store: true,
      },
      {
        name: 'solrUseConfig',
        type: 'confirm',
        message: 'Use configuration from search_api_solr?',
        default: true,
        when: usesDrupal,
        store: true,
      },
    ]);

    this.solrTag = solrTag;
    this.solrUseConfig = solrUseConfig;
  }

  async _discoverConfigDirectory() {
    // nodegit has binary dependencies and may fail to install in some situations, so we import it
    // here as an optional dependency. If the user doesn't have the module, then we merely won't
    // be able to copy the configuration for them - they'll have to do it themselves later.
    const {
      default: { Clone },
    } = await import('nodegit');

    this.log('>>> Downloading search_api_solr. This may take a moment...');

    const tempDirectory = await new Promise<string>((resolve, reject) => {
      tmp.dir({ unsafeCleanup: true }, (err, path) => {
        if (err) {
          reject(err);
        } else {
          resolve(path);
        }
      });
    });

    // Save what we think of as the repository root - repository.path() returns the path to the
    // .git directory which isn't what we need.
    const repositoryRoot = path.join(tempDirectory, 'search_api_solr');

    // Create a throwaway clone of the search_api_solr project.
    // In the future, we can sync with the intended branch of search_api_solr, but for right now
    // we just need to interrogate the project for solr config files.
    await Clone.clone(
      'https://git.drupal.org/project/search_api_solr.git',
      repositoryRoot,
    );

    const configDirectory = path.join(
      repositoryRoot,
      'solr-conf',
      this.solrTag + '.x',
    );

    // Figure out if we have a solr configuration that matches the major version we're using.
    let configExists: boolean;
    try {
      const stats = await stat(configDirectory);
      configExists = stats.isDirectory();
    } catch {
      configExists = false;
    }

    // This is the only method that assigns a string value to `configDirectory'
    if (configExists) {
      this.configDirectory = configDirectory;
    }
  }

  async configuring() {
    const editor = this.options.composeEditor as ComposeEditor;

    if (this.solrUseConfig) {
      try {
        await this._discoverConfigDirectory();
      } catch {
        // Eat errors: this process is optional and we will turn the 'use config' option off
        // in the conditional below.
      }

      // If we failed to find a matching project, we forcibly disable config to prevent solr
      // from failing to start up due to empty directory complaints.
      if (this.configDirectory === undefined) {
        this.solrUseConfig = false;
      }
    }

    const configOptions = this.solrUseConfig ? ['-d', '/opt/f1/solr-conf'] : [];
    const configMounts = this.solrUseConfig
      ? [createBindMount('./services/solr/conf', '/opt/f1/solr-conf')]
      : [];

    editor.addService('solr', {
      image: `solr:${this.solrTag}-alpine`,
      command: ['solr-create', '-c', 'docker', ...configOptions],
      ports: ['8983:8983'],
      volumes: [
        {
          type: 'volume',
          source: editor.ensureVolume('solr-data'),
          target: '/opt/solr/server/solr',
        },
        ...configMounts,
      ],
    });
  }

  async writing() {
    if (!this.solrUseConfig || this.configDirectory === undefined) {
      return;
    }

    const entries = await readdir(this.configDirectory);
    for (const entry of entries) {
      this.fs.copy(
        path.join(this.configDirectory, entry),
        this.destinationPath('services/solr/conf', entry),
      );
    }
  }
}

export = Solr;
