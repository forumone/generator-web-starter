import { descending } from 'd3-array';
import Generator from 'yeoman-generator';
import { promptOrUninteractive } from '../../../../../../util';

import ComposeEditor from '../../ComposeEditor';
import getImageTags from '../../registry/getImageTags';

class Redis extends Generator {
  // Assigned during initializing phase
  private redisTags!: ReadonlyArray<string>;

  // Assigned during prompting phase
  private redisTag!: string;

  async initializing() {
    const alpineTag = /^(\d+)-alpine$/;

    const tags = await getImageTags('redis');

    this.redisTags = tags
      .map(tag => {
        const match = alpineTag.exec(tag);
        return match && match[1];
      })
      .filter((tag): tag is string => tag !== null)
      .sort(descending);
  }

  async prompting() {
    const { redisTag } = await this._promptOrUninteractive([
      {
        name: 'redisTag',
        type: 'list',
        choices: this.redisTags,
        store: true,
        message: 'Please choose a Redis version:',
      },
    ]);

    this.redisTag = redisTag;
  }

  configuring() {
    const editor = this.options.composeEditor as ComposeEditor;

    const image = `redis:${this.redisTag}-alpine`;

    editor.addService('redis', { image });

    const cliEditor = this.options.composeCliEditor as ComposeEditor;
    cliEditor.addService('redis-cli', {
      image,
      entrypoint: ['redis-cli', '-h', 'redis'],
    });
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

export = Redis;
