/**
 * Builds a stand-in for an AWS SDK service exception.
 *
 * The load-bearing detail is `$response`: the real SDK attaches its live HTTP
 * response to the exception, which makes the error a circular object graph.
 * Ghost's API error handler deep-clones whatever it is handed, so that graph is
 * what used to turn a real S3 failure into `Maximum call stack size exceeded`.
 * The suites that exercise the S3 stores' failure paths share this rather than
 * each rebuilding it: a copy that quietly stopped being circular would leave
 * its suite passing against code that never fixed anything. Only
 * `adapters/lib/s3/errors` asserts the cycle directly, and it does so precisely
 * to keep this fixture honest for everyone else.
 */
export const s3Failure = ({
    name = 'AccessDenied',
    message = 'Access Denied',
    httpStatusCode,
    requestId,
    attempts
}: {
    name?: string;
    message?: string;
    httpStatusCode?: number;
    requestId?: string;
    attempts?: number;
} = {}): Error => {
    const err = Object.assign(new Error(message), {
        name,
        $fault: 'client',
        $metadata: {httpStatusCode, requestId, attempts}
    }) as Error & {$response?: unknown};

    err.$response = {error: err};

    return err;
};
