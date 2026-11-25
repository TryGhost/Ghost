import errors from '@tryghost/errors';
import type { ZipEntry } from '@tryghost/zip';
import type { ArchiveFiles } from './files';
import { MAX_CSV_UPLOAD_BYTES, MAX_CSV_ZIP_ENTRIES } from './limits';

function safeName(entry: ZipEntry): string {
  const name = entry.fileName.replace(/\/$/, '');
  const fileType = (entry.externalFileAttributes >>> 16) & 0o170000;
  if (
    /^[a-z]:/i.test(name) ||
    name.includes('\\') ||
    name.includes('\0') ||
    name.split('/').some((component) => !component || component === '..' || component === '.') ||
    (fileType !== 0 && fileType !== 0o100000 && fileType !== 0o040000)
  ) {
    throw new errors.UnsupportedMediaTypeError({ message: 'The ZIP contains an unsafe entry.' });
  }
  return name;
}

export async function readBoundedArchive(
  files: ArchiveFiles,
  filePath: string,
  {
    directory,
    maxBytes = MAX_CSV_UPLOAD_BYTES,
    maxEntries = MAX_CSV_ZIP_ENTRIES,
  }: { directory?: string; maxBytes?: number; maxEntries?: number } = {},
): Promise<string[]> {
  const target = directory ?? (await files.createTempDirectory('content-csv-archive-'));
  const entries: string[] = [];
  const seen = new Set<string>();

  try {
    // The shared extractor preserves archive permissions. Keep its root private,
    // and ensure the owner can read and clean even read-only archive entries.
    await files.makeArchiveDirectory(target);
    await files.extractArchive(filePath, target, {
      defaultDirMode: 0o700,
      defaultFileMode: 0o600,
      ensureOwnerPermissions: true,
      // The extractor also validates actual streamed bytes against declared sizes.
      limits: { totalUncompressedBytes: maxBytes },
      onEntry(entry, archive) {
        if (archive.entryCount > maxEntries) {
          throw new errors.UnsupportedMediaTypeError({
            message: 'The ZIP exceeds the 50,000-entry limit.',
            code: 'CSV_ZIP_TOO_MANY_ENTRIES',
          });
        }
        const name = safeName(entry);
        // Reject ambiguous archives on both case-sensitive and case-insensitive filesystems.
        const comparisonKey = name.normalize('NFC').toLowerCase();
        if (seen.has(comparisonKey)) {
          throw new errors.UnsupportedMediaTypeError({
            message: 'The ZIP contains duplicate paths.',
          });
        }
        seen.add(comparisonKey);
        const fileType = (entry.externalFileAttributes >>> 16) & 0o170000;
        const isDirectory =
          entry.fileName.endsWith('/') ||
          fileType === 0o040000 ||
          (entry.versionMadeBy >> 8 === 0 && entry.externalFileAttributes === 16);
        if (isDirectory) {
          if (entry.uncompressedSize !== 0) {
            throw new errors.UnsupportedMediaTypeError({
              message: 'The ZIP contains an invalid directory.',
            });
          }
        } else {
          entries.push(name);
        }
      },
    });
    return entries;
  } catch (error) {
    if (error instanceof errors.UnsupportedMediaTypeError && error.code === 'TOTAL_TOO_LARGE') {
      throw new errors.UnsupportedMediaTypeError({
        message: 'The expanded ZIP exceeds the 1 GiB limit.',
        code: 'CSV_ZIP_TOO_LARGE',
        err: error,
      });
    }
    throw error;
  } finally {
    // Inspection owns its temporary extraction; import extraction is owned and
    // cleaned by ImportArchive and PreparedImportSource instead.
    if (!directory) {
      await files.removeDirectory(target);
    }
  }
}
