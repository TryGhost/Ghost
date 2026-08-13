// archiver v8 ships no types and the DefinitelyTyped package targets the old
// (v7) factory API, so we declare the small surface we actually use.
declare module 'archiver' {
    import {Transform} from 'stream';

    interface EntryData {
        name: string;
        /** Write this entry uncompressed (STORE) — for already-compressed sources. */
        store?: boolean;
    }

    export class Archiver extends Transform {
        append(source: Buffer | string | NodeJS.ReadableStream, data: EntryData): this;
        file(filepath: string, data: EntryData): this;
        finalize(): Promise<void>;
    }

    export class ZipArchive extends Archiver {
        constructor(options?: {store?: boolean});
    }
}
