/**
 * Centralised logging helpers. All runtime log output goes through here so
 * any routing (Sentry, telemetry, suppress-in-prod) is one-touch.
 */

const PREFIX = '[superportal]';

export type LogReporter = (level: 'warning' | 'error', message: string, err: unknown) => void;

let reporter: LogReporter | null = null;

export function setLogReporter(fn: LogReporter | null): void {
    reporter = fn;
}

function send(level: 'warning' | 'error', message: string, err: unknown): void {
    if (!reporter) return;
    try {
        reporter(level, message, err);
    } catch {
        // A broken reporter must never break logging.
    }
}

/** Forward a rest arg to the reporter only when a caught Error is present. */
function forward(level: 'warning' | 'error', message: string, rest: unknown[]): void {
    const err = rest.find((r): r is Error => r instanceof Error);
    if (err) send(level, message, err);
}

export function warn(message: string, ...rest: unknown[]): void {
    console.warn(`${PREFIX} ${message}`, ...rest);
    forward('warning', message, rest);
}

export function error(message: string, ...rest: unknown[]): void {
    console.error(`${PREFIX} ${message}`, ...rest);
    forward('error', message, rest);
}

export function info(message: string, ...rest: unknown[]): void {
    console.info(`${PREFIX} ${message}`, ...rest);
}

/** Report an already-caught error without logging to the console. */
export function reportError(err: unknown, message = 'unhandled error'): void {
    send('error', message, err);
}
