import envPaths from 'env-paths';
import execa, { ExecaReturns, Options } from 'execa';
import mkdir from 'make-dir';
import os from 'os';
import path from 'path';
import createDebugger from 'debug';

import { composer } from './dockerfile/constants';

// Define the debugging namespace to align with other debugger output.
const debugNamespace = 'web-starter:app:plugins:platform:Docker:spawnComposer';
const debug = createDebugger(debugNamespace);

function getUserGroupOptions(): string[] {
  if (os.platform() === 'win32') {
    return [];
  }

  const { uid, gid } = os.userInfo();
  const userGroupOptions = ['--user', `${uid}:${gid}`];
  debug('Identified user group options %s.', userGroupOptions.join('='));
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
    mountOptions.push('-v', `${execaOptions.cwd}:/app:delegated`);
  }

  if (useCache) {
    const { cache } = envPaths('generator-web-starter');
    const composerCachePath = path.join(cache, 'composer');

    try {
      await mkdir(composerCachePath);
      mountOptions.push('-v', `${composerCachePath}:/tmp/cache:cached`);
    } catch {
      // Ignore errors; failing to create a subdirectory in the cache isn't fatal, it's
      // just slower.
      debug('Unable to create a cache subdirectory at %s.', composerCachePath);
    }
  }

  const dockerRunOptions = [
    'run',
    '--rm',
    '-it',
    ...userOptions,
    ...mountOptions,
    composer,
    ...args,
  ];
  // Output the full docker command for debugging. This is very verbose.
  // @todo Add execution flag support to trigger more verbose logging.
  // debug(
  //   'Executing Composer Docker command:\n%s',
  //   ['docker', ...dockerRunOptions].join(' '),
  // );

  // Output the composer command being executed without all Docker options.
  // This is much less verbose and easier to follow in logs.
  debug('Executing Composer command:\n%s', ['composer', ...args].join(' '));
  return execa('docker', dockerRunOptions, {
    stdio: 'inherit',
    ...execaOptions,
  });
}

export default spawnComposer;
