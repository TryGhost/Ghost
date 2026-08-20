import errors from '@tryghost/errors';

const DEADLINE_EXCEEDED_CODE = 'JOB_DEADLINE_EXCEEDED';

/**
 * True when a job stopped because it outlived its deadline, rather than because
 * the work itself failed. The two want opposite handling: a failure is a bug
 * worth capturing, an abandonment is a slow dependency worth a warning.
 */
export function isDeadlineExceeded(err: unknown): boolean {
    return (err as {code?: string} | null)?.code === DEADLINE_EXCEEDED_CODE;
}

/**
 * Bounds a job's wall-clock time.
 *
 * Class-based jobs run on the main event loop, where nothing can cancel them
 * mid-flight the way a worker thread could exit on a message. Shutdown instead
 * drains in-flight work, so a job that can hang indefinitely can hold shutdown
 * open past the deployment's grace period and be SIGKILLed mid-write. Any job
 * whose slowest branch is unbounded should carry a deadline shorter than that
 * grace period, and be safe to abandon and retry on its next run.
 *
 * The underlying work is not cancelled - nothing here can cancel it - it is
 * abandoned, and the process stops waiting on it. Callers should treat that as
 * a warning rather than a failure; see isDeadlineExceeded.
 */
export default function withDeadline<T>(work: Promise<T>, timeoutMs: number, jobType: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        // setTimeout coerces undefined and NaN to ~0ms, so an unresolved config
        // value would abandon every run instantly and blame the job for it.
        if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            reject(new errors.IncorrectUsageError({
                message: `Job "${jobType}" was given an invalid deadline: ${JSON.stringify(timeoutMs)}. Expected a positive number of milliseconds.`
            }));
            return;
        }

        const timer = setTimeout(() => {
            reject(new errors.InternalServerError({
                message: `Job "${jobType}" exceeded its ${timeoutMs}ms deadline and was abandoned.`,
                code: DEADLINE_EXCEEDED_CODE
            }));
        }, timeoutMs);

        // Clear before settling, not in a trailing .finally(): that would run a
        // microtask later than the awaiting continuation, leaving the timer
        // briefly live after the caller has already moved on.
        work.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}
