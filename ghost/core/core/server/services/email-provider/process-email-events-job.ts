import { Job } from '../jobs-service/job';

export class ProcessEmailEventsJob extends Job {
  static type = 'process-email-provider-events';
}
