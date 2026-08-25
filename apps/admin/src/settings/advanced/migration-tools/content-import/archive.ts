import JSZip from 'jszip';

const DATA_EXTENSIONS = new Set(['csv', 'json', 'md', 'markdown']);

export type ImportArchiveContents = { type: 'legacy' } | { type: 'csv'; csv: string; name: string };

export class ImportArchiveError extends Error {}

export async function inspectImportArchive(file: File): Promise<ImportArchiveContents> {
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(file);
  } catch {
    throw new ImportArchiveError('Unable to read ZIP file. Please select a valid ZIP file.');
  }

  const files = Object.values(archive.files).filter((entry) => !entry.dir);
  const dataFiles = files.filter(isDataFile);
  const csvFiles = dataFiles.filter((entry) => extensionOf(entry.name) === 'csv');

  if (files.some(isUnsupportedDataCSV)) {
    throw new ImportArchiveError(
      'CSV files must be at the ZIP root or inside one wrapper directory.',
    );
  }

  if (csvFiles.length === 0) {
    return { type: 'legacy' };
  }

  if (csvFiles.length > 1) {
    throw new ImportArchiveError(
      'ZIP files can contain only one CSV file. Remove the extra CSV files and try again.',
    );
  }

  if (dataFiles.length > 1) {
    throw new ImportArchiveError(
      'ZIP files cannot contain CSV, JSON, or Markdown import files together. Keep only the CSV file and try again.',
    );
  }

  validateWrapper(files, csvFiles[0]);

  return {
    type: 'csv',
    csv: await csvFiles[0].async('text'),
    name: csvFiles[0].name,
  };
}

function validateWrapper(files: JSZip.JSZipObject[], csv: JSZip.JSZipObject): void {
  const csvParts = csv.name.split('/').filter(Boolean);
  if (csvParts.length !== 2) {
    return;
  }

  const wrapper = csvParts[0];
  const outsideWrapper = files.some((entry) => {
    const parts = entry.name.split('/').filter(Boolean);
    return !isMetadata(parts) && parts[0] !== wrapper;
  });
  if (outsideWrapper) {
    throw new ImportArchiveError('Invalid ZIP file structure.');
  }
}

function isDataFile(entry: JSZip.JSZipObject): boolean {
  if (entry.dir) {
    return false;
  }

  const parts = entry.name.split('/').filter(Boolean);
  if (parts.length === 0 || isMetadata(parts)) {
    return false;
  }

  if (!DATA_EXTENSIONS.has(extensionOf(entry.name))) {
    return false;
  }

  if (parts.length === 1) {
    return true;
  }

  return parts.length === 2;
}

function isUnsupportedDataCSV(entry: JSZip.JSZipObject): boolean {
  if (entry.dir || extensionOf(entry.name) !== 'csv') {
    return false;
  }

  const parts = entry.name.split('/').filter(Boolean);
  if (parts.length === 0 || isMetadata(parts) || isCSVAttachment(parts)) {
    return false;
  }

  return !isDataFile(entry);
}

function isCSVAttachment(parts: string[]): boolean {
  const assetParts = ['content', 'files'].includes(parts[0]) ? [...parts] : parts.slice(1);
  if (assetParts[0] === 'content') {
    assetParts.shift();
  }

  return assetParts.length > 1 && assetParts[0] === 'files';
}

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isMetadata(parts: string[]): boolean {
  return (
    parts[0] === '__MACOSX' || parts.some((part) => part.startsWith('._') || part === '.DS_Store')
  );
}
