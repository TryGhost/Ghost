declare module 'ghost-storage-base' {
    import {RequestHandler} from 'express';

    export type StorageFile = {
        name: string;
        path: string;
        type?: string;
    };

    export default abstract class StorageBase {
        protected storagePath: string;
        getTargetDir(baseDir?: string): string;
        getUniqueFileName(file: StorageFile, targetDir: string): Promise<string>;
        abstract save(file: StorageFile, targetDir?: string): Promise<string>;
        abstract saveRaw(buffer: Buffer, targetPath: string): Promise<string>;
        abstract exists(fileName: string, targetDir: string): Promise<boolean>;
        abstract delete(fileName: string, targetDir: string): Promise<void>;
        abstract read(file: {path: string}): Promise<Buffer>;
        abstract serve(): RequestHandler;
        abstract urlToPath(url: string): string;
    }
}
