import decompress from 'decompress';
import fetch from 'node-fetch';
import { posix } from 'path';
import { URL } from 'url';

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
}

export default installGesso;
