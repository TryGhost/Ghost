// Type for the Koenig lexical fetcher function
export type FetchKoenigLexical<T = unknown> = () => Promise<T>;

/**
 * Suspense-compatible resource loader for Koenig lexical editor.
 * Creates a resource that can be used with React Suspense to lazy-load Koenig.
 */
export const loadKoenig = function <T = unknown> (fetchKoenigLexical: FetchKoenigLexical<T>) {
    let status: 'pending' | 'success' | 'error' = 'pending';
    let response: T | Error;

    const suspender = fetchKoenigLexical().then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err: Error) => {
            status = 'error';
            response = err;
        }
    );

    const read = (): T => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response as T;
        }
    };

    return {read};
};

export type EditorResource<T = unknown> = ReturnType<typeof loadKoenig<T>>;
