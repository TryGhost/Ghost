import { Job } from '../../jobs-service/job';

export default class UpdateCheckJob extends Job {
  static type = 'update-check';
}
