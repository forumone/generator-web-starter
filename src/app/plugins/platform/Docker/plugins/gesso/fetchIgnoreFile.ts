import fetch from 'node-fetch';

/**
 * Fetch the `.gitignore` file for a given Gesso implemenation. This function helps avoid
 * time ordering issues - the installation of D8 Gesso doesn't occur at the same phase as
 * WP Gesso, so it's easier to unconditionally fetch from GitHub instead of waiting on
 * the correct phase to copy the `.gitignore` from disk.
 *
 * @param repository The name of the repository (e.g. `'gesso'` or `'gesso-wp'`).
 * @param branch The branch to fetch from (e.g., `'8.x-3.x'` or `'3.x'`).
 */
async function fetchIgnoreFile(
  repository: string,
  branch: string,
): Promise<string> {
  const response = await fetch(
    `https://raw.githubusercontent.com/forumone/${repository}/${branch}/.gitignore`,
  );

  if (!response.ok) {
    const { status, statusText, url } = response;
    throw new Error(`fetch(${url}): ${status} ${statusText}`);
  }

  return response.text();
}

export default fetchIgnoreFile;
