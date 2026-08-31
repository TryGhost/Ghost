import { Job } from '../../jobs-service/job';

export interface ContentCSVImportJobData {
  importId: string;
  file: {
    path: string;
    name: string;
  };
  mapping?: Record<string, string>;
  importTagNames: string[];
  emailRecipient: string;
}

export default class ContentCSVImportJob extends Job {
  static type = 'content-csv-import';
  readonly importId: string;
  readonly file: ContentCSVImportJobData['file'];
  readonly mapping?: Record<string, string>;
  readonly importTagNames: string[];
  readonly emailRecipient: string;

  constructor(data: ContentCSVImportJobData) {
    super();
    this.importId = data.importId;
    this.file = data.file;
    this.mapping = data.mapping;
    this.importTagNames = data.importTagNames;
    this.emailRecipient = data.emailRecipient;
  }
}
