import getImageTags from './getImageTags';
import semverMax from './semverMax';

// NB. matches "cli-X.Y"
const cliTag = /^cli-(\d+\.\d+)$/;

// NB. matches "X-phpX.Y-fpm-alpine"
const wpTag = /^(\d+)-php(\d+\.\d+)-fpm-alpine$/;

function findLatestCliTag(tags: string[]): string {
  const maxVersion = tags
    .map(tag => cliTag.exec(tag))
    .filter((tag): tag is RegExpExecArray => tag !== null)
    .map(tag => tag[1])
    .reduce(semverMax, '0.0');

  if (maxVersion === '0.0') {
    return 'cli';
  }

  return `cli-${maxVersion}`;
}

function isGreaterWpTag(
  [, v1, php1]: RegExpExecArray,
  [, v2, php2]: RegExpExecArray,
) {
  return Number(v1) > Number(v2) && semverMax(php1, php2) === php1;
}

function findLatestWpTag(tags: string[]): string {
  const maxVersion = tags
    .map(tag => wpTag.exec(tag))
    .filter((match): match is RegExpExecArray => match !== null)
    .reduce((current, next) =>
      isGreaterWpTag(current, next) ? current : next,
    );

  // RegExp#exec's return array has the full match at index 0, which in this case is the entire
  // string due to having both start and end anchors in the `wpTag' regex.
  return maxVersion[0];
}

async function getLatestWordPressTags() {
  const tags = await getImageTags('wordpress');

  return {
    cli: findLatestCliTag(tags),
    wordpress: findLatestWpTag(tags),
  };
}

export default getLatestWordPressTags;
