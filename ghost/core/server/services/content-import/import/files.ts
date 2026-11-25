import type { Readable, Writable } from 'node:stream';

// The root supplies only the file operations used by CSV uploads and scratch data.
// Implementations receive the subset they need rather than the filesystem module.
export interface ImportFiles {
  readSource(path: string): Readable;
  writeSource(path: string): Writable;
  getSize(path: string): Promise<number>;
  createTempDirectory(prefix: string): Promise<string>;
  removeDirectory(path: string): Promise<void>;
}
