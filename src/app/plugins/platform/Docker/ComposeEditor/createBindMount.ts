type Consistency = 'consistent' | 'delegated' | 'cached';

export interface BindMountOptions {
  readOnly?: boolean;
  consistency?: Consistency;
}

function createBindMount(
  source: string,
  target: string,
  { readOnly = false, consistency = 'cached' }: BindMountOptions = {},
) {
  const flags = readOnly ? `ro,${consistency}` : consistency;

  return `${source}:${target}:${flags}`;
}

export default createBindMount;
