import decompress from 'decompress';
import fs from 'fs';
import globby from 'globby';
import moveFile from 'move-file';
import fetch from 'node-fetch';
import path, { posix } from 'path';
import rimraf from 'rimraf';
import { URL } from 'url';
import { promisify } from 'util';

import spawnComposer from './spawnComposer';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const rimrafAsync = promisify(rimraf);

export interface InstallGessoOptions {
  repository: string;
  branch: string;
  targetPath: string;
}

async function installGesso({
  branch,
  repository,
  targetPath: target,
}: InstallGessoOptions) {
  const endpoint = new URL('https://github.com');
  endpoint.pathname = posix.join(
    'forumone',
    repository,
    'archive',
    branch + '.zip',
  );

  const response = await fetch(String(endpoint));

  if (!response.ok) {
    const { status, statusText, url } = response;
    throw new Error(`fetch(${url}): ${status} ${statusText}`);
  }

  const buffer = await response.buffer();

  await decompress(buffer, target, { strip: 1 });

  try {
    await spawnComposer(
      [
        'composer',
        'create-project',
        'pattern-lab/edition-drupal-standard',
        'pattern-lab',
        '--no-interaction',
      ],
      { cwd: target },
    );
  } catch (error) {
    // We ignore exceptions thrown by spawning composer, per the pre-existing 8.x-2.x setup task.
    // cf. https://github.com/forumone/gesso/blob/8.x-2.x/tasks/config/shell.js#L5
  }

  const patternLabSourcePath = path.join(target, 'pattern-lab/source');
  const starterKitPath = path.join(target, '_starter-kit');

  const starterKitItems = await globby('**', {
    cwd: starterKitPath,
    dot: false,
  });

  await Promise.all(
    starterKitItems.map(async item => {
      const source = path.join(starterKitPath, item);
      const destination = path.join(patternLabSourcePath, item);

      return moveFile(source, destination);
    }),
  );

  await rimrafAsync(starterKitPath);

  const gessoPackagePath = path.join(target, 'package.json');

  const gessoPackage = JSON.parse(await readFile(gessoPackagePath, 'utf-8'));

  // The gessoSetup command isn't container-friendly - it tries to run composer, which,
  // in a node container, will fail. We tweak it unobtrusively here when installing the
  // theme rather than requiring more extensive breakage upstream.
  if (
    gessoPackage.scripts &&
    gessoPackage.scripts.postinstall === 'grunt gessoSetup'
  ) {
    delete gessoPackage.scripts.postinstall;
    await writeFile(gessoPackagePath, JSON.stringify(gessoPackage, null, '  '));
  }
}

export default installGesso;
