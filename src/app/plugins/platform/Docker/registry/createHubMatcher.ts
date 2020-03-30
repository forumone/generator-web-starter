import getImageTags from './getImageTags';
import semverMax from './semverMax';

const versionTag = /^\d+\.\d+$/;

/**
 * Creates a function that finds the latest PHP version for an image within Forum One's
 * Docker Hub organization. This is specialized to the various PHP-based images (e.g.,
 * WordPress and Drupal8) rather than Gesso.
 *
 * The return value is an async function that computes the latest version tag - e.g.,
 * `7.4` - which corresponds to the most recent PHP minor version available when the
 * generator was run.
 *
 * @param image The name of an image (e.g., `drupal8` or `wordpress`)
 */
function createHubMatcher(image: string) {
  return async () => {
    const tags = await getImageTags(`forumone/${image}`);

    const maxVersion = tags
      .filter(tag => versionTag.test(tag))
      .reduce(semverMax, '0.0');

    if (maxVersion === '0.0') {
      return 'latest';
    }

    return maxVersion;
  };
}

export default createHubMatcher;
