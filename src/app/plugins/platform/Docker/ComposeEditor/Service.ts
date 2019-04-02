import VolumeMount from './VolumeMount';

interface Service {
  readonly depends_on?: ReadonlyArray<string>;
  readonly command?: string | ReadonlyArray<string>;
  readonly entrypoint?: string | ReadonlyArray<string>;
  readonly env_file?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly init?: boolean;
  readonly ports?: ReadonlyArray<string>;
  readonly restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  readonly volumes?: ReadonlyArray<VolumeMount | string>;
  readonly working_dir?: string;
}

export default Service;
