import getImageTags from './getImageTags';

let got!: jest.Mock;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  got = require('got');
  got.mockClear();
});

test('get tags from hub', async () => {
  got.mockResolvedValue({
    body: [
      { layer: '', name: 'latest' },
      { layer: '', name: '1' },
      { layer: '', name: '1-alpine' },
    ],
  });

  const tags = await getImageTags('alpine');

  expect(got).toBeCalledTimes(1);
  expect(tags).toEqual(['latest', '1', '1-alpine']);
});
