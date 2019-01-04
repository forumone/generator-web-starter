type Consistency = 'consistent' | 'delegated' | 'cached';

export interface BindMountOptions {
  readOnly?: boolean;
  consistency?: Consistency;
}

// At time of writing, Docker Compose doesn't understand the longhand version of a bind mount when
// consistency options for osxfs are required. This helper function exists to ease generating
// the shorthand notation and ensure that all bind mounts are given a consistency option.
function createBindMount(
  source: string,
  target: string,
  { readOnly = false, consistency = 'cached' }: BindMountOptions = {},
) {
  const flags = readOnly ? `ro,${consistency}` : consistency;

  return `${source}:${target}:${flags}`;
}

export default createBindMount;
