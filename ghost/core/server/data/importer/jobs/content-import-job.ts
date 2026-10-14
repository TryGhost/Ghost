import { Job } from '../../../services/jobs-service/job';

export interface ContentImportJobData {
  uploadKey: string;
  fileName: string;
  emailRecipient: string;
  importTag?: string;
  returnImportedData?: boolean;
  importPersistUser?: boolean;
}

export default class ContentImportJob extends Job {
  static type = 'site-content-import';
  readonly uploadKey: string;
  readonly fileName: string;
  readonly emailRecipient: string;
  readonly importTag?: string;
  readonly returnImportedData?: boolean;
  readonly importPersistUser?: boolean;

  constructor(data: ContentImportJobData) {
    super();
    this.uploadKey = data.uploadKey;
    this.fileName = data.fileName;
    this.emailRecipient = data.emailRecipient;
    this.importTag = data.importTag;
    this.returnImportedData = data.returnImportedData;
    this.importPersistUser = data.importPersistUser;
  }
}
