// @ts-check
const {InternalServerError} = require('@tryghost/errors');

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
 * @param {() => PromiseLike<unknown>} fn
 * @returns {() => void}
 */
const oneAtATime = (fn) => {
    /** @type {'idle' | 'running' | 'running+queued'} */
    let state = 'idle';

    const run = async () => {
        try {
            await fn();
        } catch {
            // noop
        }

        switch (state) {
        case 'running+queued':
            state = 'running';
            run();
            break;
        case 'running':
            state = 'idle';
            break;
        default:
            throw new InternalServerError({message: `Unexpected state: ${state}`});
        }
    };

    return () => {
        switch (state) {
        case 'idle':
            state = 'running';
            run();
            break;
        case 'running':
            state = 'running+queued';
            break;
        case 'running+queued':
            break;
        default: {
            /** @type {never} */ const _exhaustive = state;
            throw new InternalServerError({message: `Unexpected state: ${_exhaustive}`});
        }
        }
    };
};

exports.oneAtATime = oneAtATime;
