import Service from './Service';

interface RemoteService extends Service {
  readonly image: string;
}

export default RemoteService;
