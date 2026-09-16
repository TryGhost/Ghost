export type ExternalMediaFailureStage = 'download' | 'extract' | 'unsupported' | 'storage';

export interface ExternalMediaStored {
  status: 'stored';
  sourceUrl: string;
  storedUrl: string;
}

export interface ExternalMediaFailed {
  status: 'failed';
  sourceUrl: string;
  stage: ExternalMediaFailureStage;
  reason: string;
  error?: unknown;
}

export type ExternalMediaImportResult = ExternalMediaStored | ExternalMediaFailed;

export interface ExternalMediaImporter {
  importUrl(sourceUrl: string): Promise<ExternalMediaImportResult>;
}
