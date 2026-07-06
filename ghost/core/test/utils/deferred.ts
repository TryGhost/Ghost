/**
 * Bridges the mocha `done` callback onto a promise so callback-style tests
 * run under vitest (which dropped `done` support). `done()` resolves the
 * promise; `done(err)` rejects it — matching mocha's `done` semantics.
 *
 * Usage:
 *   it('does a thing', function () {
 *       const {promise, done} = deferred();
 *       thing(() => done());
 *       return promise;
 *   });
 */
export function deferred(): {
    promise: Promise<void>;
    done: (err?: unknown) => void;
} {
    let done: (err?: unknown) => void = () => {};
    const promise = new Promise<void>((resolve, reject) => {
        done = err => (err ? reject(err) : resolve());
    });
    return {promise, done};
};
