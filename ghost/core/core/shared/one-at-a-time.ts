/**
 * Wraps an async function so it runs at most one invocation at a time, with at
 * most one additional invocation queued.
 *
 * If called while idle, it starts a run immediately. If called while a run is
 * active, it queues one follow-up run. Additional calls while that follow-up is
 * already queued do not queue more work; they return the same queued promise.
 *
 * The returned promise resolves when the current or queued run associated with
 * the call settles. It does not wait for later queued runs. Errors are silently
 * swallowed.
 */
export const oneAtATime = (fn: () => PromiseLike<unknown>): () => Promise<void> => {
    let isRunning = false;
    let queuedPromise: Promise<void> | null = null;
    let resolveQueuedPromise: (() => void) | null = null;

    const run = async (resolveCurrentPromise: () => void) => {
        try {
            await fn();
        } catch {
            // noop
        }

        resolveCurrentPromise();

        if (resolveQueuedPromise) {
            const resolveNextPromise = resolveQueuedPromise;
            queuedPromise = null;
            resolveQueuedPromise = null;
            void run(resolveNextPromise);
            return;
        }

        isRunning = false;
    };

    return () => {
        if (!isRunning) {
            isRunning = true;

            return new Promise((resolve) => {
                void run(resolve);
            });
        }

        if (!queuedPromise) {
            queuedPromise = new Promise((resolve) => {
                resolveQueuedPromise = resolve;
            });
        }

        return queuedPromise;
    };
};
