import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import envPaths from 'env-paths';
import mkdir from 'make-dir';
import os from 'os';
import path from 'path';
import Generator from 'yeoman-generator';
import { outputFormat as format } from '../../../../util';
import { composer } from './dockerfile/constants';

function getUserGroupOptions(): string[] {
  if (os.platform() === 'win32') {
    return [];
  }

  const { uid, gid } = os.userInfo();
  return ['--user', `${uid}:${gid}`];
}

export interface SpawnComposerOptions extends SpawnOptions {
  runAsUser?: boolean;
  mountCwd?: boolean;
  useCache?: boolean;
}

async function spawnComposer(
  this: Generator,
  args: ReadonlyArray<string>,
  {
    runAsUser = true,
    mountCwd = true,
    useCache = true,
    ...spawnOptions
  }: SpawnComposerOptions = {},
): Promise<ChildProcess> {
  const userOptions = runAsUser ? getUserGroupOptions() : [];
  const mountOptions: string[] = [];

  if (mountCwd && spawnOptions.cwd) {
    // Use 'delegated' since we presume that install-related Composer tasks are I/O
    // related, and thus can rely on the container being authoritative while the
    // process is running.
    mountOptions.push('-v', `${spawnOptions.cwd}:/app:delegated`);

    // Remove the `cwd` option since it was only needed to inform the directory to
    // be mounted. Since a docker command is being executed, the working directory
    // is irrelevent, but the command fails if the designated working directory
    // doesn't exist within the context the command is running in.
    delete spawnOptions.cwd;
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
      this.debug(
        format.debug('Warning: Unable to create a cache subdirectory at %s.'),
        composerCachePath,
      );
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
  this.debug(
    'Executing Composer Docker command:\n%s',
    ['docker', ...dockerRunOptions].join(' '),
  );
  this.debug(format.debug('Executing with options: %O'), spawnOptions);

  // Output the composer command being executed without all Docker options.
  // This is much less verbose and easier to follow in logs.
  this.debug(
    'Executing Composer command:\n%s',
    ['composer', ...args].join(' '),
  );

  const childProcess = this.spawnCommand('docker', dockerRunOptions, {
    stdio: 'inherit',
    ...spawnOptions,
  }) as ReturnType<typeof spawn>; // ChildProcess

  // Prepare a promise to handle executing the child process through to completion.
  const promise: Promise<ChildProcess> = new Promise((resolve, reject) => {
    // Catch process spawning failures.
    childProcess.on('error', reject);

    // Check output status which could be a success or failure.
    childProcess.on('close', (code: number | null, signal: string | null) => {
      if (!code) {
        resolve(childProcess);
      } else {
        this.debug(
          format.error(
            'Composer command failed with code "%s" and signal "%s".',
          ),
          code,
          signal,
        );
        const composerCommand = ['composer', ...args].join(' ');
        reject(new Error(`Composer command failed: ${composerCommand}`));
      }
    });
  });

  return promise;
}

export default spawnComposer;
