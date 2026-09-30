import path from 'node:path';
import moment from 'moment';
import type { RequestHandler } from 'express';

export type StorageFile = {
  name: string;
  path: string;
  type?: string;
};

export type ReadOptions = {
  path: string;
};

// Most filesystems limit a single filename component to 255 bytes (NAME_MAX).
// Object storage does not enforce this, so long client-supplied filenames can
// later fail with ENAMETOOLONG when written back to disk (e.g. archive
// downloads). We cap the generated filename here so every storage adapter
// (local, S3, and external adapters extending this base) produces portable names.
const MAX_FILENAME_LENGTH = 255;

/**
 * Base class for Ghost storage adapters.
 *
 * Concrete adapters extend this class and implement the methods listed in
 * `requiredFns`: `exists`, `save`, `serve`, `delete` and `read`.
 */
export abstract class StorageBase {
  declare readonly requiredFns: readonly ['exists', 'save', 'serve', 'delete', 'read'];

  declare storagePath: string;

  abstract exists(fileName: string, targetDir?: string): Promise<boolean>;
  abstract save(file: StorageFile, targetDir?: string): Promise<string>;
  abstract serve(): RequestHandler;
  abstract delete(fileName: string, targetDir?: string): Promise<void>;
  abstract read(options: ReadOptions): Promise<Buffer>;
  abstract saveRaw(buffer: Buffer, targetPath: string): Promise<string>;
  abstract urlToPath(url: string): string;

  constructor() {
    Object.defineProperty(this, 'requiredFns', {
      value: Object.freeze(['exists', 'save', 'serve', 'delete', 'read']),
      writable: false,
    });
  }

  getTargetDir(baseDir?: string | null): string {
    const date = moment();
    const month = date.format('MM');
    const year = date.format('YYYY');

    if (baseDir) {
      return path.join(baseDir, year, month);
    }

    return path.join(year, month);
  }

  truncateFileNameToByteLength(name: string, maxBytes: number): string {
    if (maxBytes <= 0) {
      return '';
    }

    const buffer = Buffer.from(name, 'utf8');

    if (buffer.length <= maxBytes) {
      return name;
    }

    // Back up off any UTF-8 continuation byte so we never split a character.
    let end = maxBytes;
    while (end > 0 && (buffer[end]! & 0xc0) === 0x80) {
      end -= 1;
    }

    return buffer.subarray(0, end).toString('utf8');
  }

  generateUnique(dir: string, name: string, ext: string | null, i: number): Promise<string> {
    let filename: string;
    let append = '';

    if (i) {
      append = '-' + i;
    }

    const suffix = append + (ext || '');
    const truncatedName = this.truncateFileNameToByteLength(
      name,
      MAX_FILENAME_LENGTH - Buffer.byteLength(suffix, 'utf8'),
    );

    if (ext) {
      filename = truncatedName + append + ext;
    } else {
      filename = truncatedName + append;
    }

    return this.exists(filename, dir).then((exists) => {
      if (exists) {
        i = i + 1;
        return this.generateUnique(dir, name, ext, i);
      } else {
        return path.join(dir, filename);
      }
    });
  }

  getUniqueFileName(file: StorageFile, targetDir: string): Promise<string> {
    const ext = path.extname(file.name);
    let name: string;

    // poor extension validation
    // .1 or .342 is not a valid extension, .mp4 is though!
    if (!ext.match(/\.\d+$/)) {
      name = this.getSanitizedFileName(path.basename(file.name, ext));
      return this.generateUnique(targetDir, name, ext, 0);
    } else {
      name = this.getSanitizedFileName(path.basename(file.name));
      return this.generateUnique(targetDir, name, null, 0);
    }
  }

  getSanitizedFileName(fileName: string): string {
    // below only matches ascii characters, @, and .
    // unicode filenames like город.zip would therefore resolve to ----.zip
    return fileName.replace(/[^\w@.]/gi, '-');
  }
}
