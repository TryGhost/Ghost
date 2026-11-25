import type { Readable, Writable } from 'node:stream';
import type { extract } from '@tryghost/zip';

// The root supplies only the file operations used by CSV uploads and scratch data.
// Implementations receive the subset they need rather than the filesystem module.
export interface ImportFiles {
  readSource(path: string): Readable;
  writeSource(path: string): Writable;
  getSize(path: string): Promise<number>;
  createTempDirectory(prefix: string): Promise<string>;
  removeDirectory(path: string): Promise<void>;
  readCache(path: string): Promise<string>;
  writeCache(path: string, data: string): Promise<void>;
  makeArchiveDirectory(path: string): Promise<void>;
  extractArchive: typeof extract;
}

export type ArchiveFiles = Pick<
  ImportFiles,
  'extractArchive' | 'makeArchiveDirectory' | 'createTempDirectory' | 'removeDirectory'
>;
