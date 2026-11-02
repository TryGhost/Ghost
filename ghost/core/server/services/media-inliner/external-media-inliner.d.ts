import type { ExternalMediaImportResult, ExternalMediaInlinerDependencies } from './types';

declare class ExternalMediaInliner {
  constructor(deps: ExternalMediaInlinerDependencies);

  getMediaStorage: ExternalMediaInlinerDependencies['getMediaStorage'];

  importUrl(sourceUrl: string): Promise<ExternalMediaImportResult>;
  inline(domains: string[]): Promise<void>;
}

export = ExternalMediaInliner;
