import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

export interface StagedImportFile {
  path: string;
  name: string;
}

export interface ImportFileStager {
  stage(file: { filePath: string; fileName: string }): Promise<StagedImportFile>;
  remove(file: StagedImportFile): Promise<void>;
}

export function createImportFileStager(): ImportFileStager {
  return {
    async stage({ filePath, fileName }) {
      const stagedPath = path.join(os.tmpdir(), `content-csv-import-${crypto.randomUUID()}`);

      try {
        await fs.copyFile(filePath, stagedPath, fs.constants.COPYFILE_EXCL);
        await fs.chmod(stagedPath, 0o600);
      } catch (error) {
        await fs.remove(stagedPath).catch(() => {});
        throw error;
      }

      return { path: stagedPath, name: fileName };
    },

    async remove(file) {
      await fs.remove(file.path);
    },
  };
}
