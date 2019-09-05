import { major } from 'semver';

import getImageTags from './getImageTags';
import semverMax from './semverMax';

async function getLatestDrupalTag(majorVersion: number): Promise<string> {
  const drupalTag = /^(\d+\.\d+\.\d+)-fpm-alpine$/;

  const tags = await getImageTags('drupal');

  const maxVersion = tags
    .map(tag => drupalTag.exec(tag))
    .filter(
      (match): match is RegExpExecArray =>
        match !== null && major(match[1]) === majorVersion,
    )
    .map(match => match[1])
    .reduce(semverMax, '0.0.0');

  if (maxVersion === '0.0.0') {
    return 'fpm-alpine';
  }

  return `${maxVersion}-fpm-alpine`;
}

export default getLatestDrupalTag;
