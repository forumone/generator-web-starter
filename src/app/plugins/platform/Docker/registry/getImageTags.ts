import fetch from 'node-fetch';

interface LayerAndTag {
  readonly layer: '';
  readonly name: string;
}

// This function _should_ be reading from the Docker registry properly -- that is, using
// https://www.npmjs.com/package/docker-registry-client -- but this doesn't let us do what we're
// trying to get out of the registry.
//
// When you visit the page for a specific Docker image (library/nginx, for example), there are
// several tags grouped together on the same line, because they all share a SHA digest. For example,
// at time of writing, the nginx:alpine tag is also known as:
// * 1-alpine
// * 1.15-alpine
// * mainline-alpine
// * 1.15.8-alpine
//
// We would like to be able to ask the registry for a known tag -- 'nginx:alpine' and be able to
// work backwards from the list of tags to find a more version-stable identifier. In this case,
// it would be 1.15-alpine.
//
// However, there are many, many issues with registry interactions.
// The V2 registry gets us close, but while the it sends us a great deal of information for
// each tag, we don't get an image's digest - just that of its layers.
// The V1 registry _does_ return this information, but only for an arbitrary subset of known tags.
// The data is essentially unusable because things like 'nginx:latest' are missing and can't be
// queried, even directly.
//
// As a result, we are forced to use this endpoint while unauthenticated. We won't receive any
// metadata about a tag - just its name. However, generally library images follow a fairly strict
// set of naming guidelines for each variation, so tag discovery for specific iamges can proceed
// with minimal fear of messing up.
async function getImageTags(imageName: string): Promise<string[]> {
  const url = `https://registry.hub.docker.com/v1/repositories/${encodeURIComponent(
    imageName,
  )}/tags`;

  const response = await fetch(url);
  if (!response.ok) {
    const { status, statusText, url } = response;
    throw new Error(
      `Failed to request tags for ${imageName}: fetch(${url}) returned ${status} ${statusText}`,
    );
  }

  const tagList: LayerAndTag[] = await response.json();
  return tagList.map(item => item.name);
}

export default getImageTags;
