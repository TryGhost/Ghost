import { Job } from '../../services/jobs-service/job';

export default class ClearExpiredAuthRowsJob extends Job {
  static type = 'clear-expired-auth-rows';
}
