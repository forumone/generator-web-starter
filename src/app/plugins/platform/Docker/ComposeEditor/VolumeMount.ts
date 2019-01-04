interface VolumeMount {
  readonly type: 'volume';
  readonly source: string;
  readonly target: string;
  readonly read_only?: boolean;
}

export default VolumeMount;
