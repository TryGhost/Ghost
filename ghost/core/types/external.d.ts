declare module 'ghost-storage-base' {
    export type StorageFile = {
        name: string;
        path: string;
    };

    export default class StorageBase {
        protected storagePath: string;
        getTargetDir(baseDir: string): string;
        getUniqueFileName(file: StorageFile, targetDir: string): Promise<string>;
    }
}
