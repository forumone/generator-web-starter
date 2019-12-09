import Service from './Service';

export interface BuildContext {
  readonly context: string;
  readonly dockerfile?: string;
  readonly target?: string;
}

interface LocalService extends Service {
  readonly build: string | BuildContext;
}

export default LocalService;
