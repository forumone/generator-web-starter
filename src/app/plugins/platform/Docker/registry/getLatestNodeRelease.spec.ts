import getLatestNodeRelease from './getLatestNodeRelease';

let got!: jest.Mock;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  got = require('got');
  got.mockClear();
});

const listingWithLts = [
  { version: 'v1.2.3', lts: false },
  { version: 'v4.1.0', lts: 'uranium' },
  { version: 'v2.3.1', lts: false },
];

const listingWithoutLts = [
  { version: 'v1.2.3', lts: false },
  { version: 'v2.3.1', lts: false },
];

const checksumsForLts = `
11223344 node-v4.1.0-linux-x64.tar.xz
55667788 node-v4.1.0-darwin-x64.tar.gz
AABBCCDD node-v4.1.0-linux-x64.tar.gz
`;

const checksumsForNotLts = `
11223344 node-v1.2.3-linux-x64.tar.gz
55667788 node-v2.3.1-linux-x64.tar.gz
`;

const badChecksums = '';

test.each`
  type         | version     | checksum      | listing              | checksums
  ${'LTS'}     | ${'v4.1.0'} | ${'AABBCCDD'} | ${listingWithLts}    | ${checksumsForLts}
  ${'not LTS'} | ${'v2.3.1'} | ${'55667788'} | ${listingWithoutLts} | ${checksumsForNotLts}
`(
  'Finds $type release $version',
  async ({ version, checksum, listing, checksums }) => {
    got
      .mockResolvedValueOnce({ body: listing })
      .mockResolvedValue({ body: checksums });

    const latestNodeRelease = await getLatestNodeRelease();

    expect(got).toBeCalledTimes(2);
    expect(got).toHaveBeenNthCalledWith(
      1,
      'https://nodejs.org/dist/index.json',
      { json: true },
    );
    expect(latestNodeRelease.version).toEqual(version);
    expect(latestNodeRelease.checksum).toEqual(checksum);
  },
);

test.each`
  type         | listing
  ${'LTS'}     | ${listingWithLts}
  ${'not LTS'} | ${listingWithoutLts}
`('Fails to parse checksums for $type releases', async ({ listing }) => {
  got
    .mockResolvedValueOnce({ body: listing })
    .mockResolvedValue({ body: badChecksums });

  await expect(getLatestNodeRelease()).rejects.toThrowErrorMatchingSnapshot();
});
