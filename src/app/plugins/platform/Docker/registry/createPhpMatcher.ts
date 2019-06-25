import getImageTags from './getImageTags';
import semverMax from './semverMax';

function createPhpMatcher(suffix: string) {
  const regex = new RegExp(`^(\\d+\\.\\d+)-${suffix}$`);

  return async (): Promise<string> => {
    const tags = await getImageTags('php');

    const maxVersion = tags
      .map(tag => regex.exec(tag))
      .filter((match): match is RegExpExecArray => match !== null)
      .map(array => array[1])
      .reduce(semverMax, '0.0');

    if (maxVersion === '0.0') {
      return suffix;
    }

    return `${maxVersion}-${suffix}`;
  };
}

export default createPhpMatcher;
