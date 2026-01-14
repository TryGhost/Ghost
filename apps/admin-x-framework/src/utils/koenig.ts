// Type for the Koenig lexical fetcher function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>;

/**
 * Suspense-compatible resource loader for Koenig lexical editor.
 * Creates a resource that can be used with React Suspense to lazy-load Koenig.
 */
export const loadKoenig = function (fetchKoenigLexical: FetchKoenigLexical) {
    let status = 'pending';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;

    const suspender = fetchKoenigLexical().then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err) => {
            status = 'error';
            response = err;
        }
    );

    const read = () => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response;
        }
    };

    return {read};
};

export type EditorResource = ReturnType<typeof loadKoenig>;
