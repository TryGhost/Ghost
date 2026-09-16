import type { ExternalMediaImportResult } from './types';

declare class ExternalMediaInliner {
  constructor(deps: object);

  importUrl(sourceUrl: string): Promise<ExternalMediaImportResult>;
  inline(domains: string[]): Promise<void>;
}

export = ExternalMediaInliner;
