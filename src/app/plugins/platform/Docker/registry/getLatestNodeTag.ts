import getImageTags from './getImageTags';

const majorAlpineVersion = /^(\d+)-alpine$/;

// "latest" in the Node world actually means latest LTS release - we assume that by
// using an LTS image, we are less likely to run into long-term support issues for a
// project after it has been set up.
async function getLatestNodeTag(): Promise<string> {
  const tags = await getImageTags('node');

  const maxVersion = tags
    .map(tag => majorAlpineVersion.exec(tag))
    .filter(
      (tag): tag is RegExpExecArray =>
        // Node LTS versions are always even-numbered: 6, 8, and 10 are all LTS
        // releases, whereas 7, 9, and 11 are not.
        tag !== null && Number(tag[1]) % 2 === 0,
    )
    .map(tag => tag[0])
    .reduce((current, tag) => Math.max(current, parseFloat(tag)), 0);

  return maxVersion + '-alpine';
}

export default getLatestNodeTag;
