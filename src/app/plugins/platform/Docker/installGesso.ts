import decompress from 'decompress';
import fetch from 'node-fetch';
import { posix } from 'path';
import { URL } from 'url';
import { existsSync, promises as fs } from 'fs';

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
    `${branch}.zip`,
  );

  const response = await fetch(String(endpoint));

  if (!response.ok) {
    const { status, statusText, url } = response;
    throw new Error(`fetch(${url}): ${status} ${statusText}`);
  }

  const buffer = await response.buffer();

  await decompress(buffer, target, {
    strip: 1,
    // Filter out files used for development of Gesso itself.
    filter: file =>
      posix.basename(file.path).indexOf('docker-compose') !== 0 &&
      posix.dirname(file.path).indexOf('.buildkite') === -1,
  });

  // Remove the .buildkite directory.
  const buildkiteDir = posix.join(target, '.buildkite');
  if (existsSync(buildkiteDir)) {
    await fs.rmdir(buildkiteDir);
  }
}

export default installGesso;
