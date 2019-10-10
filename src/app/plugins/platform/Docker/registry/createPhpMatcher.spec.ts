import createPhpMatcher from './createPhpMatcher';

let getImageTags!: jest.Mock;

jest.mock('./getImageTags');

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  getImageTags = require('./getImageTags').default;
  getImageTags.mockClear();
});

test('get PHP versions', async () => {
  getImageTags.mockResolvedValueOnce([
    '7.3-fpm',
    '7.3-fpm-alpine',
    '7.3-cli',
    '7.3-cli-alpine',
    '7.2-fpm',
    '7.2-fpm-alpine',
    '7.2-cli',
    '7.2-cli-alpine',
    '5.6-fpm',
    '5.6-fpm-alpine',
    '5.6-cli',
    '5.6-cli-alpine',
  ]);

  const matcher = createPhpMatcher('cli');
  const value = await matcher();

  expect(getImageTags).toBeCalledWith('php');
  expect(getImageTags).toBeCalledTimes(1);
  expect(value).toEqual('7.3-cli');
});
