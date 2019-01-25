import getImageTags from './getImageTags';
import semverMax from './semverMax';

// NB. matches X.Y-cli-alpine
const cliAlpine = /^(\d+\.\d+)-cli-alpine$/;

async function getLatestPhpCliTag(): Promise<string> {
  const tags = await getImageTags('php');

  const maxVersion = tags
    .map(tag => cliAlpine.exec(tag))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(array => array[1])
    .reduce(semverMax, '0.0');

  if (maxVersion === '0.0') {
    return 'cli-alpine';
  }

  return maxVersion + '-cli-alpine';
}

export default getLatestPhpCliTag;