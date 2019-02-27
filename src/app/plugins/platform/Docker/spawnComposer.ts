import envPaths from 'env-paths';
import execa, { ExecaReturns, Options } from 'execa';
import mkdir from 'make-dir';
import os from 'os';
import path from 'path';

function getUserGroupOptions(): string[] {
  if (os.platform() === 'win32') {
    return [];
  }

  const { uid, gid } = os.userInfo();
  return ['--user', `${uid}:${gid}`];
}

export interface SpawnComposerOptions extends Options {
  runAsUser?: boolean;
  mountCwd?: boolean;
  useCache?: boolean;
}

async function spawnComposer(
  args: ReadonlyArray<string>,
  {
    runAsUser = true,
    mountCwd = true,
    useCache = true,
    ...execaOptions
  }: SpawnComposerOptions = {},
): Promise<ExecaReturns> {
  const userOptions = runAsUser ? getUserGroupOptions() : [];
  const mountOptions: string[] = [];

  if (mountCwd && execaOptions.cwd) {
    // Use 'delegated' since we presume that install-related Composer tasks are I/O
    // related, and thus can rely on the container being authoritative while the
    // process is running.
    mountOptions.push('-v', execaOptions.cwd + ':/app:delegated');
  }

  if (useCache) {
    const { cache } = envPaths('generator-web-starter');
    const composerCachePath = path.join(cache, 'composer');

    try {
      await mkdir(composerCachePath);
      mountOptions.push('-v', composerCachePath + ':/tmp/cache:cached');
    } catch {
      // Ignore errors; failing to create a subdirectory in the cache isn't fatal, it's
      // just slower.
    }
  }

  return execa(
    'docker',
    [
      'run',
      '--rm',
      '-it',
      ...userOptions,
      ...mountOptions,
      'composer:1.7',
      ...args,
    ],
    {
      stdio: 'inherit',
      ...execaOptions,
    },
  );
}

export default spawnComposer;
