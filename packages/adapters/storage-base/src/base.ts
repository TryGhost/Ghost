import path from 'node:path';
import moment from 'moment';
import type {RequestHandler} from 'express';

export type StorageFile = {
    name: string;
    path: string;
    type?: string;
};

export type ReadOptions = {
    path: string;
};

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
            writable: false
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

    generateUnique(dir: string, name: string, ext: string | null, i: number): Promise<string> {
        let filename: string;
        let append = '';

        if (i) {
            append = '-' + i;
        }

        if (ext) {
            filename = name + append + ext;
        } else {
            filename = name + append;
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
