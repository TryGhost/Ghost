export const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return {promise, resolve, reject};
};
export type Deferred<T> = ReturnType<typeof deferred<T>>;
