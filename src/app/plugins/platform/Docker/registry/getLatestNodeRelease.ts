import fetch, { Response } from 'node-fetch';
import semver from 'semver';

interface Release {
  readonly version: string;
  readonly date: string;
  readonly files: ReadonlyArray<string>;
  readonly npm?: string;
  readonly v8: string;
  readonly uv?: string;
  readonly openssl?: string;
  readonly modules?: string;
  readonly lts: string | false;
  readonly security: boolean;
}

export interface Dist {
  readonly version: string;
  readonly checksum: string;
}

async function fetchHelper(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    const { url, status, statusText } = response;
    throw new Error(`fetch(${url}): ${status} ${statusText}`);
  }

  return response;
}

async function getLatestRelease(): Promise<Release> {
  const response = await fetchHelper('https://nodejs.org/dist/index.json');
  const versions: Release[] = await response.json();

  // Compare b <=> a for descending sort
  versions.sort((a, b) => semver.compare(b.version, a.version));

  return versions.find(version => version.lts !== false) || versions[0];
}

async function getReleaseChecksum(version: string): Promise<string> {
  const response = await fetchHelper(
    `https://nodejs.org/dist/${version}/SHASUMS256.txt`,
  );

  const checksums = await response.text();

  // NB. SHASUMS256.txt is formatted like so:
  // 9a16909157e68d4e409a73b008994ed05b4b6bc952b65ffa7fbc5abb973d31e9  node-v12.4.0-linux-x64.tar.gz
  // This means that splitting on lines and then whitespace is sufficient to "parse" the string
  // into a checksum/file pair.
  const parsed = checksums
    .split('\n')
    .map(line => line.split(/\s+/) as [string, string]);

  const releaseFile = `node-${version}-linux-x64.tar.gz`;
  const matching = parsed.find(pair => pair[1] === releaseFile);
  if (!matching) {
    throw new Error(
      `Unable to find checksum for Node.js release ${releaseFile}`,
    );
  }

  return matching[0];
}

async function getLatestNodeVersion(): Promise<Dist> {
  const release = await getLatestRelease();
  const checksum = await getReleaseChecksum(release.version);

  return {
    checksum,
    version: release.version,
  };
}

export default getLatestNodeVersion;
