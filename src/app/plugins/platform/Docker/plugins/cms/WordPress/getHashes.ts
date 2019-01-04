import fetch from 'node-fetch';

async function getHashes(): Promise<string> {
  const response = await fetch(
    'https://api.wordpress.org/secret-key/1.1/salt/',
  );

  if (!response.ok) {
    return '';
  }

  return response.text();
}

export default getHashes;
