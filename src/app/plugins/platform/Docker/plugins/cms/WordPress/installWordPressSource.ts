import OctokitClient from '@octokit/rest';
import decompress from 'decompress';
import fetch from 'node-fetch';

async function getLatestWpRelease() {
  const client = new OctokitClient();

  const response = await client.repos.listTags({
    owner: 'WordPress',
    repo: 'WordPress',
  });

  if (response.status !== 200) {
    throw new Error(`Failed to retrieve WP tags: HTTP ${response.status}`);
  }

  // Assumption: the topmost (i.e., most recent) WordPress tag is the latest version
  return response.data[0];
}

// Installs WordPress from source for projects not using the wp-starter Composer package.
async function installWordPressSource(destination: string) {
  const release = await getLatestWpRelease();

  const response = await fetch(release.zipball_url);
  if (!response.ok) {
    const { status, statusText, url } = response;
    throw new Error(
      `Failed to retrieve ${release.name}: fetch(${url}) returned ${status} ${statusText}`,
    );
  }

  const contents = await response.buffer();

  await decompress(contents, destination, { strip: 1 });
}

export default installWordPressSource;
