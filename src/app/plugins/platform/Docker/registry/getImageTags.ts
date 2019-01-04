import fetch from 'node-fetch';

interface LayerAndTag {
  readonly layer: '';
  readonly name: string;
}

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
