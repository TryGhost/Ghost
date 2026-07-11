/**
 * Wraps an async function so it runs at most one invocation at a time, with at
 * most one additional invocation queued.
 *
 * Possible states:
 *
 * - idle: nothing is running
 * - running: function is active, nothing is queued
 * - running + queued: function is active, another invocation enqueued
 *
 * Errors are silently swallowed.
 *
 * The inner function returns a promise that resolves when the current
 * invocation and any queued invocation have completed. All concurrent callers
 * receive the same promise, which only resolves once all pending work is
 * finished.
 */
export const oneAtATime = (
    fn: () => PromiseLike<unknown>
): () => Promise<void> => {
    let promise: null | Promise<void> = null;
    let queued = false;

    const run = async () => {
        try {
            await fn();
        } catch {
            // noop
        }

        if (queued) {
            queued = false;
            promise = run();
        } else {
            promise = null;
        }
    };

    return () => {
        if (promise) {
            queued = true;
        } else {
            promise = run();
        }
        return promise;
    };
};
