import discoverModules from './discoverModules';

let globby!: jest.Mock;

jest.mock('globby');

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globby = require('globby');
  globby.mockClear();
});

test('discover modules', async () => {
  globby.mockResolvedValue(['Foo', 'Bar.js', 'Baz']);

  const modules = await discoverModules('plugins');

  expect(globby).toBeCalledTimes(1);
  expect(globby).toBeCalledWith('*', { cwd: 'plugins', onlyFiles: false });
  expect(modules).toEqual(['Foo', 'Bar', 'Baz']);
});
