declare module '@tryghost/logging' {
    export function error(...args: any[]): void;
    export function warn(...args: any[]): void;
    export function info(...args: any[]): void;
    export function debug(...args: any[]): void;
}

declare module '@tryghost/debug' {
    function debug(namespace: string): (...args: any[]) => void;
    export = debug;
}