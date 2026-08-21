import logging from '@tryghost/logging';

type LogMethod = 'info' | 'error';

function bestEffort(method: LogMethod, args: unknown[]): void {
    try {
        logging[method](...args);
    } catch {
        // Observability must not control background-job execution.
    }
}

export function info(...args: unknown[]): void {
    bestEffort('info', args);
}

export function error(...args: unknown[]): void {
    bestEffort('error', args);
}
