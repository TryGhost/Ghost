import {NoSuchKey, NotFound} from '@aws-sdk/client-s3';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

/**
 * The S3 operations the settings-style stores issue. Kept as a union so a
 * mistyped operation name is a build error rather than a misleading label in a
 * production error report.
 */
export type S3Operation = 'GetObject' | 'HeadObject' | 'CopyObject' | 'PutObject';

/**
 * What the caller was doing, which is not the same as which S3 call failed:
 * saving takes a backup first, so a `save` can fail on a `HeadObject`. The
 * message names what the operator asked for and the details name the call.
 */
export type S3Action = 'read' | 'save';

const messages = {
    readFailed: 'Could not read {resource} from storage: {code} ({operation}).',
    saveFailed: 'Could not save {resource} to storage: {code} ({operation}).',
    permissionsHelp: 'The storage credentials Ghost is configured with are not allowed to perform this operation on the bucket. Check the credentials and the bucket permissions.',
    missingBucketHelp: 'The configured storage bucket could not be found. Check the bucket name, region and endpoint in your storage configuration.',
    transientHelp: 'The storage service is temporarily unavailable or rate limiting requests. Wait a moment and try again.',
    connectivityHelp: 'Ghost could not reach the storage service. Check the endpoint in your storage configuration and that the service is reachable from this server.'
};

type HelpKey = 'permissionsHelp' | 'missingBucketHelp' | 'transientHelp' | 'connectivityHelp';

/**
 * Maps the failure codes an operator can actually act on to a next step. The
 * keys are whatever `resolveCode` can produce: S3/GCS XML API error codes, the
 * SDK's own client-side names, the names `CODE_BY_STATUS` synthesises, and the
 * Node.js `errno` codes that surface when the request never reaches the
 * service. Anything unmapped gets no `help` rather than a guess.
 */
const HELP_BY_CODE: Partial<Record<string, HelpKey>> = {
    AccessDenied: 'permissionsHelp',
    Forbidden: 'permissionsHelp',
    InvalidAccessKeyId: 'permissionsHelp',
    SignatureDoesNotMatch: 'permissionsHelp',
    ExpiredToken: 'permissionsHelp',
    InvalidToken: 'permissionsHelp',
    CredentialsProviderError: 'permissionsHelp',
    NoSuchBucket: 'missingBucketHelp',
    SlowDown: 'transientHelp',
    ServiceUnavailable: 'transientHelp',
    InternalError: 'transientHelp',
    RequestTimeout: 'transientHelp',
    TimeoutError: 'transientHelp',
    ECONNREFUSED: 'connectivityHelp',
    ECONNRESET: 'connectivityHelp',
    ENOTFOUND: 'connectivityHelp',
    EAI_AGAIN: 'connectivityHelp',
    ETIMEDOUT: 'connectivityHelp',
    EPIPE: 'connectivityHelp'
};

/**
 * What to call a failure the SDK could not name — see `resolveCode`. These are
 * chosen to read like the S3 code the same condition would carry if the
 * response had had a body to parse one out of, so `403` reports `Forbidden`
 * rather than a bare status.
 */
const CODE_BY_STATUS: Partial<Record<number, string>> = {
    403: 'Forbidden',
    408: 'RequestTimeout',
    429: 'SlowDown',
    500: 'InternalError',
    502: 'ServiceUnavailable',
    503: 'ServiceUnavailable',
    504: 'ServiceUnavailable'
};

/**
 * Strings that tell an operator nothing, whether they arrive as the exception's
 * name or as its message: the SDK's placeholders for a response it could not
 * read a code out of, and the generic wrappers Node throws when the request
 * never reached the service.
 */
const UNINFORMATIVE: ReadonlySet<string> = new Set(['Error', 'Unknown', 'UnknownError', 'AggregateError']);

const ERRNO = /^E[A-Z0-9_]+$/;

interface S3ErrorShape {
    name?: string;
    message?: string;
    code?: unknown;
    stack?: string;
    $metadata?: {
        httpStatusCode?: number;
        requestId?: string;
        attempts?: number;
    };
}

/**
 * True when S3 reported the object as absent. `GetObject` raises `NoSuchKey`
 * and `HeadObject` raises `NotFound` for the same condition, so both count.
 */
export function isS3NotFound(err: unknown): boolean {
    return err instanceof NotFound || err instanceof NoSuchKey;
}

/**
 * Derive the code to report. Reporting a placeholder like `Error` or `Unknown`
 * would recreate exactly the "the message tells you nothing" problem this
 * module exists to fix, so each source is tried in turn, most specific first.
 */
function resolveCode(err: S3ErrorShape): string {
    const errno = typeof err.code === 'string' ? err.code : undefined;

    // A Node errno always wins. S3 codes are PascalCase words and never look
    // like this, and it is the only useful thing on the `AggregateError` that
    // happy-eyeballs throws for a refused connection to a dual-stack host —
    // whose `name` is `AggregateError` and whose `message` is empty.
    if (errno && ERRNO.test(errno)) {
        return errno;
    }

    // The SDK puts the service error code in `name` (`AccessDenied`,
    // `NoSuchBucket`, ...) whenever it could parse one out of the response.
    if (err.name && !UNINFORMATIVE.has(err.name)) {
        return err.name;
    }

    // A HEAD response has no body, so the SDK cannot read a `<Code>` out of a
    // failed HeadObject and falls back to naming it `Unknown`. Since the
    // existence check runs before every write, that is the single most likely
    // way a permissions problem reaches an operator — recover the code from the
    // status rather than reporting `Unknown`.
    const fromStatus = err.$metadata?.httpStatusCode && CODE_BY_STATUS[err.$metadata.httpStatusCode];
    if (fromStatus) {
        return fromStatus;
    }

    return errno || 'UnknownError';
}

/**
 * Ghost error codes the stores report under. Enumerated rather than left as
 * `string` so a typo is a build error, matching `S3Operation`.
 */
export type S3StorageErrorCode = 'ROUTE_SETTINGS_STORAGE_REQUEST_FAILED' | 'REDIRECTS_STORAGE_REQUEST_FAILED';

export interface S3RequestErrorOptions {
    /** What the caller was doing — a store's write path reports `save` even for the reads it makes along the way. */
    action: S3Action;
    /** The S3 API call that failed. */
    operation: S3Operation;
    /** Bucket the call was made against. */
    bucket: string;
    /** Object key the call was made against — the canonical object or a backup. */
    key: string;
    /** What the operator recognises the object as, e.g. `routes.yaml`. */
    resource: string;
    /** Ghost error code, so the two stores stay distinguishable in logs. */
    errorCode: S3StorageErrorCode;
}

/**
 * Convert an S3 failure into a Ghost error that names the object, the
 * operation, the S3 error code and — where we can be useful — what to do about
 * it. Everything is copied out by value, so the result is safe to serialise.
 */
export function toS3RequestError(err: unknown, options: S3RequestErrorOptions): errors.InternalServerError {
    const s3Error = (err ?? {}) as S3ErrorShape;
    const code = resolveCode(s3Error);
    const template = options.action === 'save' ? messages.saveFailed : messages.readFailed;
    const helpKey = Object.hasOwn(HELP_BY_CODE, code) ? HELP_BY_CODE[code] : undefined;

    // When the SDK could not read a code out of the response it fills the
    // message with the same placeholder it used for the name, so reporting it
    // as the cause would show the operator the word "UnknownError" and nothing
    // else — the exact kind of non-answer this module exists to remove.
    const cause = s3Error.message && !UNINFORMATIVE.has(s3Error.message) ? s3Error.message : undefined;

    const storeError = new errors.InternalServerError({
        message: tpl(template, {resource: options.resource, code, operation: options.operation}),
        context: cause,
        help: helpKey && tpl(messages[helpKey]),
        code: options.errorCode,
        errorDetails: {
            operation: options.operation,
            bucket: options.bucket,
            key: options.key,
            s3ErrorCode: code,
            statusCode: s3Error.$metadata?.httpStatusCode,
            requestId: s3Error.$metadata?.requestId,
            attempts: s3Error.$metadata?.attempts
        }
    });

    // Carry the origin frames across as a string rather than passing the SDK
    // exception as `err`. `GhostError` copies every own property of `err` onto
    // itself, which would drag `$response` — a live HTTP response holding a
    // circular object graph — onto an error the API layer deep-clones. That is
    // the recursion that replaces a real S3 failure with "Maximum call stack
    // size exceeded". A stack string clones safely.
    if (typeof s3Error.stack === 'string') {
        storeError.stack = `${storeError.stack}\n\nCaused by: ${s3Error.stack}`;
    }

    return storeError;
}
