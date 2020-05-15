import { descending } from 'd3-array';
import dedent from 'dedent';
import Generator from 'yeoman-generator';

import ComposeEditor, { createBindMount } from '../../ComposeEditor';
import getImageTags from '../../registry/getImageTags';

// Contents of services/solr/conf/.gitkeep
const gitKeepMessage = dedent`
  This file is used to preserve the services/solr/conf directory.

  Make sure that you update this directory with new Solr configuration as it is generated.
`;

// Entrypoint script to conditionally start Solr with a core's configuration
const solrEntrypoint = dedent(`
  args=()
  if test -e /opt/f1/solr-conf/solrconfig.xml; then
    args=(-d /opt/f1/solr-conf)
  fi

  exec solr-create -c docker "$\${args[@]}"
`);

class Solr extends Generator {
  // Assigned during initialization
  private solrTagOptions!: ReadonlyArray<string>;

  // Assigned during prompting
  private solrTag!: string;

  async initializing() {
    // NB. matches, e.g., "7-alpine" - we assume that for our purposes a major version tag is
    // enough.
    const slimTag = /^(\d+)-slim$/;

    const tags = await getImageTags('solr');

    this.solrTagOptions = tags
      .map(tag => {
        const match = slimTag.exec(tag);

        return match && match[1];
      })
      .filter((tag): tag is string => tag !== null)
      .sort(descending);
  }

  async prompting() {
    const { solrTag } = await this.prompt([
      {
        name: 'solrTag',
        type: 'list',
        choices: this.solrTagOptions,
        message: 'Choose a Solr version:',
        store: true,
      },
    ]);

    this.solrTag = solrTag;
  }

  async configuring() {
    const editor = this.options.composeEditor as ComposeEditor;

    editor.addService('solr', {
      image: `solr:${this.solrTag}-slim`,
      entrypoint: ['/bin/bash', '-c', solrEntrypoint],
      ports: ['8983:8983'],
      volumes: [
        {
          type: 'volume',
          source: editor.ensureVolume('solr-data'),
          target: '/opt/solr/server/solr',
        },
        createBindMount('./services/solr/conf', '/opt/f1/solr-conf'),
      ],
    });
  }

  async writing() {
    this.fs.write(
      this.destinationPath('services/solr/conf/.gitkeep'),
      gitKeepMessage,
    );
  }
}

export = Solr;
