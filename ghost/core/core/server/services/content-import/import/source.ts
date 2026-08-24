import fs from 'fs-extra';
import path from 'path';
import { globSync } from 'glob';

const errors = require('@tryghost/errors');
const ImportArchive = require('../../../data/importer/import-archive');

const DATA_EXTENSIONS = new Set(['.csv', '.json', '.md', '.markdown']);

export interface ImportSourceRequest {
  filePath: string;
  fileName: string;
}

export interface PreparedImportSource {
  filePath: string;
  cleanup(): Promise<void>;
}

const noCleanup = async (): Promise<void> => {};

export async function prepareImportSource(
  request: ImportSourceRequest,
): Promise<PreparedImportSource> {
  const extension = path.extname(request.fileName).toLowerCase();
  if (extension === '.csv') {
    return { filePath: request.filePath, cleanup: noCleanup };
  }

  if (extension !== '.zip') {
    throw new errors.ValidationError({ message: 'Please select a valid CSV or ZIP file.' });
  }

  const archive = new ImportArchive({
    extensions: [...DATA_EXTENSIONS],
    directories: [],
  });
  const directory = await archive.extract(request.filePath);
  let cleaned = false;
  const cleanup = async () => {
    if (!cleaned) {
      cleaned = true;
      await fs.remove(directory);
    }
  };

  try {
    archive.isValid(directory);
    const baseDirectory = archive.getBaseDirectory(directory);
    const entries = globSync('**/*', { cwd: directory, nodir: true, dot: true });
    const dataFiles = entries.filter(isDataFile);
    const csvFiles = dataFiles.filter((file) => extensionOf(file) === '.csv');

    if (csvFiles.length === 0) {
      throw new errors.ValidationError({
        message: 'ZIP files uploaded here must contain one CSV file.',
      });
    }

    if (csvFiles.length > 1) {
      throw new errors.ValidationError({
        message:
          'ZIP files can contain only one CSV file. Remove the extra CSV files and try again.',
      });
    }

    if (dataFiles.length > 1) {
      throw new errors.ValidationError({
        message:
          'ZIP files cannot contain CSV, JSON, or Markdown import files together. Keep only the CSV file and try again.',
      });
    }

    validateWrapper(entries, csvFiles[0]);
    const csvParts = csvFiles[0].split('/').filter(Boolean);
    const csvBaseDirectory = csvParts.length === 2 ? csvParts[0] : undefined;
    if (csvBaseDirectory !== baseDirectory) {
      throw new errors.ValidationError({ message: 'Invalid ZIP file structure.' });
    }

    return {
      filePath: path.join(directory, csvFiles[0]),
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function validateWrapper(entries: string[], csvFile: string): void {
  const csvParts = csvFile.split('/').filter(Boolean);
  if (csvParts.length !== 2) {
    return;
  }

  const wrapper = csvParts[0];
  const outsideWrapper = entries.some((entry) => {
    const parts = entry.split('/').filter(Boolean);
    return !isMetadata(parts) && parts[0] !== wrapper;
  });
  if (outsideWrapper) {
    throw new errors.ValidationError({ message: 'Invalid ZIP file structure.' });
  }
}

export function isDataFile(fileName: string): boolean {
  const parts = fileName.split('/').filter(Boolean);
  if (parts.length === 0 || isMetadata(parts)) {
    return false;
  }

  const extension = extensionOf(fileName);
  if (!DATA_EXTENSIONS.has(extension)) {
    return false;
  }

  if (parts.length === 1) {
    return true;
  }

  return parts.length === 2;
}

function extensionOf(fileName: string): string {
  return path.posix.extname(fileName).toLowerCase();
}

function isMetadata(parts: string[]): boolean {
  return (
    parts[0] === '__MACOSX' || parts.some((part) => part.startsWith('._') || part === '.DS_Store')
  );
}
