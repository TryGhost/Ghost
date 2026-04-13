declare module '@tryghost/logging' {
    export function error(...args: unknown[]): void;
    export function warn(...args: unknown[]): void;
    export function info(...args: unknown[]): void;
    export function debug(...args: unknown[]): void;
}

declare module '@tryghost/debug' {
    function debug(namespace: string): (...args: unknown[]) => void;
    export = debug;
}

declare module 'busboy' {
    import {IncomingHttpHeaders} from 'http';
    import {Writable} from 'stream';

    interface BusboyConfig {
        headers: IncomingHttpHeaders;
        highWaterMark?: number;
        fileHwm?: number;
        defCharset?: string;
        preservePath?: boolean;
        limits?: {
            fieldNameSize?: number;
            fieldSize?: number;
            fields?: number;
            fileSize?: number;
            files?: number;
            parts?: number;
            headerPairs?: number;
        };
    }

    interface Busboy extends Writable {
        on(event: 'field', listener: (name: string, val: string, info: {nameTruncated: boolean; valueTruncated: boolean; encoding: string; mimeType: string}) => void): this;
        on(event: 'file', listener: (name: string, file: NodeJS.ReadableStream, info: {filename: string; encoding: string; mimeType: string}) => void): this;
        on(event: 'close', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: string, listener: (...args: unknown[]) => void): this;
    }

    function busboy(config: BusboyConfig): Busboy;
    export = busboy;
}