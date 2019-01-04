import { ComposeVersion } from './composeVersion';
import LocalService from './LocalService';
import RemoteService from './RemoteService';

export type AnyService = RemoteService | LocalService;

interface ComposeFile {
  readonly version: ComposeVersion;

  readonly services: Readonly<Record<string, AnyService>>;

  readonly volumes: Readonly<Record<string, null>>;
}

export default ComposeFile;
