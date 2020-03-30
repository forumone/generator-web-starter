import { gt } from 'semver';

import getImageTags from './getImageTags';

// MB. matches X.Y-cliA.B.C
const cliTag = /^(\d+\.\d+)-cli(\d+\.\d+\.\d+)$/;

// Used in case we don't find any tags
const latest = ['latest', '0.0', '0.0.0'];

function reduceLatestTag(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const [, php1, cli1] = a;
  const [, php2, cli2] = b;

  if (gt(`${php1}.0`, `${php2}.0`)) {
    return a;
  }

  if (gt(cli1, cli2)) {
    return a;
  }

  return b;
}

async function getLatestWordPressCliTag(): Promise<string> {
  const tags = await getImageTags('forumone/wordpress-cli');

  const match = tags
    .map(tag => cliTag.exec(tag))
    .filter((match): match is RegExpExecArray => match !== null)
    .reduce(reduceLatestTag, latest);

  // match[0] is the full match as found by RegExp#exec - in this case, we get
  // the full PHP version + WP-CLI version.
  return match[0];
}

export default getLatestWordPressCliTag;
