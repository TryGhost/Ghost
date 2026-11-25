import { Job } from '../../jobs-service/job';

export interface ContentCSVImportJobData {
  importId: string;
  file: {
    key: string;
    name: string;
  };
  mapping?: Record<string, string>;
  importTagNames: string[];
  emailRecipient: string;
  reportOwnerId: string;
}

export default class ContentCSVImportJob extends Job {
  static type = 'content-csv-import';
  // Replayed jobs resume from their durable checkpoint using the same import ID.
  static replayAfterRestart = true;
  readonly importId: string;
  readonly file: ContentCSVImportJobData['file'];
  readonly mapping?: Record<string, string>;
  readonly importTagNames: string[];
  readonly emailRecipient: string;
  readonly reportOwnerId: string;

  constructor(data: ContentCSVImportJobData) {
    super();
    this.importId = data.importId;
    this.file = data.file;
    this.mapping = data.mapping;
    this.importTagNames = data.importTagNames;
    this.emailRecipient = data.emailRecipient;
    this.reportOwnerId = data.reportOwnerId;
  }
}
