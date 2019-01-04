import Service from './Service';

export interface BuildContext {
  readonly context: string;
  readonly dockerfile?: string;
}

interface LocalService extends Service {
  readonly build: string | BuildContext;
}

export default LocalService;
