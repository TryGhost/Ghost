import { createHash } from 'node:crypto';
import path from 'node:path';
import type { ExternalMediaImportResult } from '../../media-inliner/types';
import type { ImportFiles } from './files';

export interface MediaCache {
  get(url: string): Promise<ExternalMediaImportResult | undefined>;
  set(url: string, result: ExternalMediaImportResult): Promise<void>;
  close(): Promise<void>;
}

// One private directory per attempt. Only in-flight lookups stay on the heap.
export class DiskMediaCache implements MediaCache {
  private directory?: Promise<string>;
  private readonly files: Pick<
    ImportFiles,
    'createTempDirectory' | 'removeDirectory' | 'readCache' | 'writeCache'
  >;

  constructor(files: DiskMediaCache['files']) {
    this.files = files;
  }

  private async key(url: string): Promise<string> {
    this.directory ??= this.files.createTempDirectory('csv-media-cache-');
    return path.join(await this.directory, createHash('sha256').update(url).digest('hex'));
  }

  async get(url: string): Promise<ExternalMediaImportResult | undefined> {
    try {
      const data = await this.files.readCache(await this.key(url));
      return JSON.parse(data) as ExternalMediaImportResult;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  async set(url: string, result: ExternalMediaImportResult): Promise<void> {
    // Failure objects may include transport internals. Only the stable failure
    // information is needed when another row refers to the same media.
    const entry =
      result.status === 'failed'
        ? {
            status: result.status,
            sourceUrl: result.sourceUrl,
            stage: result.stage,
            reason: result.reason,
          }
        : result;
    await this.files.writeCache(await this.key(url), JSON.stringify(entry));
  }

  async close(): Promise<void> {
    if (this.directory) {
      await this.files.removeDirectory(await this.directory);
      this.directory = undefined;
    }
  }
}
