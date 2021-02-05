import dedent from 'dedent';
import Generator from 'yeoman-generator';
import { promptOrUninteractive } from '../../../../../../util';

import ComposeEditor, { createBindMount } from '../../ComposeEditor';
import { AnyService } from '../../ComposeEditor/ComposeFile';

const gitKeepMessage = dedent`
  This file is used to preserve the services/elasticsearch/config directory.

  Make sure that you update this directory with new Elasticsearch configuration as it is generated.
`;

interface ElasticSearchOptions {
  cap_add: string[];
  ulimits: Record<
    'memlock' | 'nofile',
    {
      hard: number;
      soft: number;
    }
  >;
}

class ElasticSearch extends Generator {
  // Assigned during initialization
  private esTagOptions!: ReadonlyArray<string>;

  // Assigned during prompting
  private esTag!: string;

  async initializing() {
    this.esTagOptions = ['7.9.3', '7.8.1', '7.7.1', '7.4.2', '7.1.1'];
  }

  async prompting() {
    const { esTag } = await this._promptOrUninteractive([
      {
        name: 'esTag',
        type: 'list',
        choices: this.esTagOptions,
        message: 'Choose an Elasticsearch version:',
        store: true,
      },
    ]);

    this.esTag = esTag;
  }

  async configuring() {
    const editor = this.options.composeEditor as ComposeEditor;

    editor.addService('elasticsearch', {
      image: `elasticsearch:${this.esTag}`,
      ulimits: {
        memlock: {
          soft: -1,
          hard: -1,
        },
        nofile: {
          soft: 65536,
          hard: 65536,
        },
      },
      cap_add: ['IPC_LOCK'],
      // Even though port 9300 is a port used by ES we should not forward that
      // port by default; it is used for communication between nodes and is a security
      // risk unless properly configured.
      ports: ['9200:9200'],
      volumes: [
        {
          type: 'volume',
          source: editor.ensureVolume('elasticsearch-data'),
          target: '/usr/share/elasticsearch/data',
        },
        createBindMount(
          './services/elasticsearch/config/elasticsearch.yml',
          '/usr/share/elasticsearch/config/elasticsearch.yml',
        ),
      ],
    } as AnyService & ElasticSearchOptions);
  }

  async writing() {
    this.fs.write(
      this.destinationPath('services/elasticsearch/config/.gitkeep'),
      gitKeepMessage,
    );

    this.fs.write(
      this.destinationPath('services/elasticsearch/config/elasticsearch.yml'),
      dedent`
        cluster.name: "docker-cluster"
        network.host: 0.0.0.0
        discovery.seed_hosts : []
        cluster.initial_master_nodes: elasticsearch
        node.name: elasticsearch
      `,
    );
  }

  /**
   * Shortcut the promptOrUninteractive call with prefilled arguments.
   *
   * @param prompts
   */
  private async _promptOrUninteractive(prompts: Generator.Questions) {
    return await promptOrUninteractive(
      prompts,
      this.options.uninteractive,
      this,
    );
  }
}

export = ElasticSearch;
