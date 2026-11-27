import { Job } from '../../jobs-service/job';

export default class CleanTokensJob extends Job {
  static type = 'clean-tokens';
}
