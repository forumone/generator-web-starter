import { stringify } from 'yaml';

import ComposeFile, { AnyService } from './ComposeFile';
import composeVersion from './composeVersion';
import createBindMount from './createBindMount';
import Service from './Service';

export interface ComposeEditorOptions {
  intro?: string;
}

// Make input YAML-safe by prepending a '#' on all lines that don't already have one.
// 'abc\ndef' ==> '# abc\n# def'
// '# comment' ==> '# comment'
// 'abc\n\ndef' ==> '# abc\n\n# def'
function prependCommentMarker(comment: string): string {
  return comment.replace(/^(?!#)(?=.)/gm, '# ');
}

class ComposeEditor {
  private services: ComposeFile['services'] = {};
  private volumes: ComposeFile['volumes'] = {};

  private intro: string | undefined;

  constructor(options: ComposeEditorOptions = {}) {
    this.intro = options.intro;
  }

  addService(name: string, service: AnyService) {
    this.services = {
      ...this.services,
      [name]: service,
    };
  }

  addVolume(name: string) {
    this.volumes = {
      ...this.volumes,
      [name]: null,
    };
  }

  ensureVolume(name: string) {
    this.addVolume(name);
    return name;
  }

  serialize() {
    const file: ComposeFile = {
      version: composeVersion,
      services: this.services,
      volumes: this.volumes,
    };

    // docker-compose uses the YAML-1.1 schema, which interprets the bare constant 'yes' as True
    // instead of the string 'yes', so we have to use this schema to avoid MYSQL_RANDOM_ROOT_PASSWORD
    // being misinterpreted and thus causing a schema validation failure.
    const contents = stringify(file, { schema: 'yaml-1.1' });
    if (this.intro) {
      const intro = prependCommentMarker(this.intro.trim()) + '\n';
      return intro + contents;
    }

    return contents;
  }

  // Sugar for commonly-used services below this line

  // Adds nginx with various defaults
  addNginxService({ volumes = [], ...service }: Service) {
    this.addService('nginx', {
      image: 'nginx:alpine',
      ports: ['8080:80', '8443:443'],
      ...service,
      volumes: [
        // These are output by the root Docker generator, so we can unconditionally
        // output these mounts.
        createBindMount(
          './services/nginx/local.crt',
          '/etc/nginx/ssl/local.crt',
          { readOnly: true },
        ),
        createBindMount(
          './services/nginx/local.key',
          '/etc/nginx/ssl/local.key',
          { readOnly: true },
        ),
        ...volumes,
      ],
    });
  }

  addMysqlService() {
    const dataVolumeName = 'mysql-data';

    this.addService('mysql', {
      image: 'mysql:5.7',
      environment: {
        MYSQL_DATABASE: 'web',
        MYSQL_USER: 'web',
        MYSQL_PASSWORD: 'web',
        // Scrambles the password for the 'root' user.
        MYSQL_RANDOM_ROOT_PASSWORD: 'yes',
      },
      ports: ['13306:3306'],
      volumes: [
        { type: 'volume', source: dataVolumeName, target: '/var/lib/mysql' },
      ],
    });

    this.addVolume(dataVolumeName);
  }

  addMailhogService() {
    this.addService('mailhog', {
      image: 'mailhog/mailhog',
      ports: ['8025:8025'],
    });
  }
}

export default ComposeEditor;

export { default as createBindMount } from './createBindMount';
