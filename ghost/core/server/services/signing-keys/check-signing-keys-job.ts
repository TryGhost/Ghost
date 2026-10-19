import { Job } from '../jobs-service/job';

export default class CheckSigningKeysJob extends Job {
  static type = 'check-signing-keys';
}
