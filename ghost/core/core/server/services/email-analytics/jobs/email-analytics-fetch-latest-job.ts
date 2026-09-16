import { Job } from '../../jobs-service/job';

export default class EmailAnalyticsFetchLatestJob extends Job {
  static type = 'email-analytics-fetch-latest';
}
