import Generator from 'yeoman-generator';

import ComposeEditor from '../../ComposeEditor';

class Memcache extends Generator {
  configuring() {
    const editor = this.options.composeEditor as ComposeEditor;

    // Assumption: memcached doesn't change often, so it's safe to pick the ':alpine' tag
    // and call it a day.
    editor.addService('memcached', { image: 'memcached:alpine' });
  }
}

export = Memcache;
