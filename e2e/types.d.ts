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