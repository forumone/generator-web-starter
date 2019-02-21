import execa, { ExecaReturns, Options } from 'execa';
import os from 'os';

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
}

async function spawnComposer(
  args: ReadonlyArray<string>,
  {
    runAsUser = true,
    mountCwd = true,
    ...execaOptions
  }: SpawnComposerOptions = {},
): Promise<ExecaReturns> {
  const userOptions = runAsUser ? getUserGroupOptions() : [];
  const mountOptions =
    // Use 'delegated' since we presume that install-related Composer tasks are I/O
    // related, and thus can rely on the container being authoritative while the
    // process is running.
    mountCwd && execaOptions.cwd
      ? ['-v', execaOptions.cwd + ':/app:delegated']
      : [];

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
