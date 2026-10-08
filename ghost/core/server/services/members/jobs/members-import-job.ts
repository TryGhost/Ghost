import { Job } from '../../jobs-service/job';
import type { Label } from '../import-export/import/row';

// Everything a deferred members import needs once the request has returned: the key its
// checked rows were spooled under, and the request-time values the import and its email use.
export interface MembersImportJobData {
  spoolKey: string;
  labelName: string;
  extraLabels: Label[];
  emailRecipient: string;
}

export default class MembersImportJob extends Job {
  static type = 'members-import';
  readonly spoolKey: string;
  readonly labelName: string;
  readonly extraLabels: Label[];
  readonly emailRecipient: string;

  constructor(data: MembersImportJobData) {
    super();
    this.spoolKey = data.spoolKey;
    this.labelName = data.labelName;
    this.extraLabels = data.extraLabels;
    this.emailRecipient = data.emailRecipient;
  }
}
