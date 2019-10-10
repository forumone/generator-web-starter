import getLatestNodeTag from './getLatestNodeTag';

jest.mock('./getImageTags');

let getImageTags!: jest.Mock;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  getImageTags = require('./getImageTags').default;
  getImageTags.mockClear();
});

test('find alpine tag', async () => {
  getImageTags.mockResolvedValue([
    '6-alpine',
    '8-alpine',
    '10',
    '7',
    '7-alpine',
  ]);

  const latestNodeTag = await getLatestNodeTag();

  expect(getImageTags).toBeCalledTimes(1);
  expect(getImageTags).toBeCalledWith('node');
  expect(latestNodeTag).toEqual('8-alpine');
});
