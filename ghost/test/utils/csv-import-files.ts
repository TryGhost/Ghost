import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ImportFiles } from '../../core/server/services/content-import/import/files';

// Real, private test files exercise streaming, permissions and cleanup without
// making the unit under test reach into its service root for dependencies.
export const importFiles: ImportFiles = {
  readSource: (filePath) => createReadStream(filePath),
  writeSource: (filePath) => createWriteStream(filePath, { mode: 0o600 }),
  getSize: async (filePath) => (await stat(filePath)).size,
  createTempDirectory: (prefix) => mkdtemp(path.join(os.tmpdir(), prefix)),
  removeDirectory: (directory) => rm(directory, { recursive: true, force: true }),
};
