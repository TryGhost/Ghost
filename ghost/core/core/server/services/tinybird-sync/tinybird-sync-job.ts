import { Job } from '../jobs-service/job';

export default class TinybirdSyncJob extends Job {
  static type = 'tinybird-sync';
}
