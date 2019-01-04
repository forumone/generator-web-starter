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
    mountCwd && execaOptions.cwd ? ['-v', execaOptions.cwd + ':/app'] : [];

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
