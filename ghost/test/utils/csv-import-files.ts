import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extract } from '@tryghost/zip';
import type { ImportFiles } from '../../core/server/services/content-import/import/files';

// Real, private test files exercise streaming, permissions and cleanup without
// making the unit under test reach into its service root for dependencies.
export const importFiles: ImportFiles = {
  readSource: (filePath) => createReadStream(filePath),
  writeSource: (filePath) => createWriteStream(filePath, { mode: 0o600 }),
  getSize: async (filePath) => (await stat(filePath)).size,
  createTempDirectory: (prefix) => mkdtemp(path.join(os.tmpdir(), prefix)),
  removeDirectory: (directory) => rm(directory, { recursive: true, force: true }),
  readCache: (filePath) => readFile(filePath, 'utf8'),
  writeCache: (filePath, data) => writeFile(filePath, data, { mode: 0o600 }),
  makeArchiveDirectory: async (directory) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  },
  extractArchive: extract,
};
