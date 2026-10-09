import { Job } from '../../jobs-service/job';

export default class CleanGiftsJob extends Job {
  static type = 'clean-gifts';
}
