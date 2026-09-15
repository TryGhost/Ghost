import { Job } from '../../jobs-service/job';

// The upload waits in the import file store under fileKey; fileName keeps the
// original name so the job knows whether it holds a CSV or a zip.
export interface ContentCSVImportJobData {
  importId: string;
  fileKey: string;
  fileName: string;
  mapping?: Record<string, string>;
  importTagNames: string[];
  emailRecipient: string;
}

export default class ContentCSVImportJob extends Job {
  static type = 'content-csv-import';
  readonly importId: string;
  readonly fileKey: string;
  readonly fileName: string;
  readonly mapping?: Record<string, string>;
  readonly importTagNames: string[];
  readonly emailRecipient: string;

  constructor(data: ContentCSVImportJobData) {
    super();
    this.importId = data.importId;
    this.fileKey = data.fileKey;
    this.fileName = data.fileName;
    this.mapping = data.mapping;
    this.importTagNames = data.importTagNames;
    this.emailRecipient = data.emailRecipient;
  }
}
