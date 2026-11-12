import type { OriginSchemes } from './origin-schemes';
import type { ExternalMediaImportResult, ExternalMediaInlinerDependencies } from './types';

declare class ExternalMediaInliner {
  constructor(deps: ExternalMediaInlinerDependencies);

  getMediaStorage: ExternalMediaInlinerDependencies['getMediaStorage'];

  startInlining(domains?: string[]): Promise<void>;
  importUrl(
    sourceUrl: string,
    options?: { originSchemes?: OriginSchemes },
  ): Promise<ExternalMediaImportResult>;
  inline(domains: string[]): Promise<void>;
}

export = ExternalMediaInliner;
