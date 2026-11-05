import type { GhostLogger } from '@tryghost/logging';

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

export interface ExternalMediaInlinerDependencies {
  PostModel: object;
  PostMetaModel: object;
  TagModel: object;
  UserModel: object;
  /** Picks the storage for a file, or null if no storage accepts it. */
  getMediaStorage: (extension: string, fileBuffer: Buffer) => Promise<unknown>;
  logging: Pick<GhostLogger, 'info' | 'warn' | 'error'>;
  /** External HTTP client with SSRF protection; see lib/request-external. */
  request: (
    url: string,
    options: { followRedirect: boolean; responseType: 'buffer' },
  ) => Promise<{ body: Buffer; headers: Record<string, string | string[] | undefined> }>;
  urlUtils: { toTransformReady(url: string): string };
  /** Loads file-type on first use; a rejection falls back to Content-Type and the URL. */
  loadFileType: () => Promise<{
    fileTypeFromBuffer: (buffer: Buffer) => Promise<{ ext: string } | undefined>;
  }>;
  /** Loads the HEIC codec when a file needs converting; a throw fails that extraction. */
  loadHeicConvert: () => (options: { buffer: Buffer; format: 'JPEG' }) => Promise<Buffer>;
}
