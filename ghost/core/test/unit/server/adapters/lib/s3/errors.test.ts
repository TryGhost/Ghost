import assert from 'node:assert/strict';
import {NoSuchKey, NotFound} from '@aws-sdk/client-s3';
import {utils as errorUtils} from '@tryghost/errors';

import {isS3NotFound, toS3RequestError} from '../../../../../../core/server/adapters/lib/s3/errors';

const OPTIONS = {
    bucket: 'a-bucket',
    key: 'content/settings/routes.yaml',
    resource: 'routes.yaml',
    errorCode: 'ROUTE_SETTINGS_STORAGE_REQUEST_FAILED'
} as const;

// Mimics an AWS SDK service exception, including the circular reference back to
// its own HTTP response that made the API error handler recurse until the stack
// blew.
const serviceException = (name: string, overrides: Record<string, unknown> = {}) => {
    const err = Object.assign(new Error(`${name} message`), {
        name,
        $fault: 'client',
        $metadata: {httpStatusCode: 403, requestId: 'REQ-123', attempts: 2},
        ...overrides
    }) as Error & {$response?: unknown};
    err.$response = {error: err};
    return err;
};

describe('UNIT: adapters/lib/s3/errors', function () {
    describe('isS3NotFound', function () {
        it('recognises the missing-object error from both GetObject and HeadObject', function () {
            assert.equal(isS3NotFound(new NoSuchKey({$metadata: {}, message: 'nope'})), true);
            assert.equal(isS3NotFound(new NotFound({$metadata: {}, message: 'nope'})), true);
        });

        it('does not treat other failures as missing objects', function () {
            assert.equal(isS3NotFound(serviceException('AccessDenied')), false);
            assert.equal(isS3NotFound(undefined), false);
            assert.equal(isS3NotFound(null), false);
        });
    });

    describe('toS3RequestError', function () {
        it('names the resource, S3 code and operation in the message', function () {
            const err = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.message, 'Could not read routes.yaml from storage: AccessDenied (GetObject).');
            assert.equal(err.errorType, 'InternalServerError');
            assert.equal(err.code, 'ROUTE_SETTINGS_STORAGE_REQUEST_FAILED');
            assert.equal(err.context, 'AccessDenied message');
        });

        // Saving takes a backup first, so a save can fail on a HeadObject or a
        // CopyObject. The operator asked to save, so that is what the message
        // says — the S3 call it actually failed on is in the details.
        it('describes what the caller was doing, not which S3 call failed', function () {
            const put = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'});
            const copy = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'CopyObject'});
            const head = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'HeadObject'});
            const get = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.match(put.message, /^Could not save routes\.yaml to storage/);
            assert.match(copy.message, /^Could not save routes\.yaml to storage/);
            assert.match(head.message, /^Could not save routes\.yaml to storage/);
            assert.match(get.message, /^Could not read routes\.yaml from storage/);
        });

        it('reports the bucket, key and S3 request metadata as details', function () {
            const err = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.deepEqual(err.errorDetails, {
                operation: 'PutObject',
                bucket: 'a-bucket',
                key: 'content/settings/routes.yaml',
                s3ErrorCode: 'AccessDenied',
                statusCode: 403,
                requestId: 'REQ-123',
                attempts: 2
            });
        });

        it('suggests a next step for the failures an operator can act on', function () {
            assert.match(
                String(toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'}).help),
                /credentials/
            );
            assert.match(
                String(toS3RequestError(serviceException('NoSuchBucket'), {...OPTIONS, action: 'save', operation: 'PutObject'}).help),
                /bucket name, region and endpoint/
            );
            assert.match(
                String(toS3RequestError(serviceException('SlowDown'), {...OPTIONS, action: 'save', operation: 'PutObject'}).help),
                /temporarily unavailable/
            );
        });

        it('offers no guess for an unrecognised code', function () {
            const err = toS3RequestError(serviceException('SomeBrandNewCode'), {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.equal(err.help, undefined);
        });

        // A request that never reaches S3 throws a plain Error whose `name` is
        // the useless string 'Error'; the real cause is in `code`.
        it('falls back to the errno when the failure never reached S3', function () {
            const connectionRefused = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9000'), {
                code: 'ECONNREFUSED'
            });

            const err = toS3RequestError(connectionRefused, {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.errorDetails.s3ErrorCode, 'ECONNREFUSED');
            assert.match(err.message, /ECONNREFUSED \(GetObject\)/);
            assert.match(String(err.help), /could not reach the storage service/);
        });

        // Node's happy-eyeballs connect rejects dual-stack hosts with an
        // AggregateError whose name is useless and whose message is empty. The
        // errno is the only thing on it worth reporting.
        it('prefers the errno over an AggregateError name', function () {
            const aggregate = Object.assign(new AggregateError([], ''), {code: 'ECONNREFUSED'});

            const err = toS3RequestError(aggregate, {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.equal(err.errorDetails.s3ErrorCode, 'ECONNREFUSED');
            assert.match(String(err.help), /could not reach the storage service/);
        });

        // A HEAD response carries no body, so the SDK cannot parse a <Code> out
        // of a failed HeadObject and names the exception 'Unknown'. The
        // existence check runs before every write, so this is the most likely
        // shape a permissions problem arrives in.
        it('recovers the code from the status when the SDK could not name the failure', function () {
            const headForbidden = Object.assign(new Error('UnknownError'), {
                name: 'Unknown',
                $metadata: {httpStatusCode: 403}
            });

            const err = toS3RequestError(headForbidden, {...OPTIONS, action: 'save', operation: 'HeadObject'});

            assert.equal(err.errorDetails.s3ErrorCode, 'Forbidden');
            assert.equal(err.message, 'Could not save routes.yaml to storage: Forbidden (HeadObject).');
            assert.match(String(err.help), /credentials/);
        });

        it('maps the other statuses the SDK leaves unnamed', function () {
            const unnamed = (httpStatusCode: number) => toS3RequestError(
                Object.assign(new Error(''), {name: 'Unknown', $metadata: {httpStatusCode}}),
                {...OPTIONS, action: 'save', operation: 'PutObject'}
            ).errorDetails.s3ErrorCode;

            assert.equal(unnamed(503), 'ServiceUnavailable');
            assert.equal(unnamed(500), 'InternalError');
            assert.equal(unnamed(429), 'SlowDown');
            assert.equal(unnamed(418), 'UnknownError');
        });

        it('reports UnknownError when there is nothing to go on', function () {
            const err = toS3RequestError(new Error('something went wrong'), {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.errorDetails.s3ErrorCode, 'UnknownError');
        });

        it('does not throw on a non-object rejection', function () {
            const err = toS3RequestError(undefined, {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.errorDetails.s3ErrorCode, 'UnknownError');
            assert.equal(err.context, undefined);
        });

        it('does not pick up help from Object.prototype', function () {
            const err = toS3RequestError(Object.assign(new Error('odd'), {name: 'constructor'}), {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.help, undefined);
        });

        it('leaves the S3 metadata fields undefined when the SDK reported none', function () {
            const err = toS3RequestError(new Error('no metadata'), {...OPTIONS, action: 'read', operation: 'GetObject'});

            assert.equal(err.errorDetails.statusCode, undefined);
            assert.equal(err.errorDetails.requestId, undefined);
            assert.equal(err.errorDetails.attempts, undefined);
        });

        it('stays a 500 — the caller is not the one who lacks access', function () {
            const err = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.equal(err.statusCode, 500);
        });

        it('keeps the origin stack without keeping the SDK exception', function () {
            const sdkError = serviceException('AccessDenied');

            const err = toS3RequestError(sdkError, {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.match(String(err.stack), /\nCaused by: \w+: AccessDenied message\n {4}at /);
            assert.equal((err as unknown as {$response?: unknown}).$response, undefined);
            assert.equal((err as unknown as {$metadata?: unknown}).$metadata, undefined);
        });

        // The load-bearing property: `prepareError` only leaves an error alone
        // if it is already a Ghost error. Anything else it re-wraps with
        // `{err}`, which is what copies `$response` onto the error that is
        // about to be deep-cloned.
        it('produces an error prepareError will not re-wrap', function () {
            const err = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'});

            assert.equal(errorUtils.isGhostError(err), true);
        });

        // The bug this module exists to prevent: the API error handler
        // deep-clones the error before rendering it, and a circular object
        // graph makes that clone recurse until the stack blows, replacing the
        // real failure with "Maximum call stack size exceeded".
        it('survives the deep clone the API error handler performs', function () {
            const err = toS3RequestError(serviceException('AccessDenied'), {...OPTIONS, action: 'save', operation: 'PutObject'});

            const cloned = errorUtils.prepareStackForUser(err) as typeof err;

            assert.equal(cloned.code, 'ROUTE_SETTINGS_STORAGE_REQUEST_FAILED');
            assert.equal(cloned.errorDetails.s3ErrorCode, 'AccessDenied');
        });

        // Guards the guard: if the fixture ever stopped being circular, the
        // test above would pass against the unfixed code too.
        it('the fixture really does blow the stack when cloned directly', function () {
            assert.throws(
                () => errorUtils.prepareStackForUser(serviceException('AccessDenied')),
                RangeError
            );
        });
    });
});
