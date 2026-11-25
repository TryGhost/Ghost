import { Job } from '../../jobs-service/job';

export default class CleanCSVUploadsJob extends Job {
  static type = 'clean-csv-import-uploads';
}
