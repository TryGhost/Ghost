import { Job } from '../../jobs-service/job';

export default class CleanExpiredCompedJob extends Job {
  static type = 'clean-expired-comped';
}
