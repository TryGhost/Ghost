import assert from 'node:assert/strict';
import sinon from 'sinon';
import {CopyObjectCommand, HeadObjectCommand, PutObjectCommand, type S3Client} from '@aws-sdk/client-s3';

import S3RedirectsStore from '../../../../../core/server/adapters/redirects/S3RedirectsStore';

const CANONICAL_KEY = 'content/data/redirects.json';

interface GhostErrorShape {
    errorType?: string;
    code?: string;
    context?: string;
    errorDetails?: {
        operation?: string;
        key?: string;
        s3ErrorCode?: string;
        statusCode?: number;
    };
}

// Mimics an AWS SDK exception, including the circular reference back to its own
// HTTP response that made the API error handler recurse until the stack blew.
const s3Failure = (): Error => {
    const err = Object.assign(new Error('Access denied.'), {
        name: 'AccessDenied',
        $metadata: {httpStatusCode: 403}
    }) as Error & {$response?: unknown};
    err.$response = {error: err};
    return err;
};

const storeWithClient = (send: (command: unknown) => Promise<unknown>) => {
    const client: Pick<S3Client, 'send'> = {send: sinon.stub().callsFake(send)};
    return new S3RedirectsStore({
        bucket: 'a-bucket',
        staticFileURLPrefix: 'content/data',
        s3Client: client as S3Client
    });
};

describe('UNIT: S3RedirectsStore', function () {
    describe('constructor validation', function () {
        it('throws when no bucket is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({} as never),
                {errorType: 'IncorrectUsageError', message: /bucket/}
            );
        });

        it('throws when no staticFileURLPrefix is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x'} as never),
                {errorType: 'IncorrectUsageError', message: /staticFileURLPrefix/}
            );
        });

        it('throws when only accessKeyId is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', accessKeyId: 'AKIA'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when only secretAccessKey is provided', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', secretAccessKey: 'shh'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('throws when sessionToken is provided without the credential pair', function () {
            assert.throws(
                () => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', sessionToken: 'session'}),
                {errorType: 'IncorrectUsageError', message: /accessKeyId.*secretAccessKey/}
            );
        });

        it('accepts a tenantPrefix without throwing', function () {
            assert.doesNotThrow(() => new S3RedirectsStore({bucket: 'x', staticFileURLPrefix: 'content/data', tenantPrefix: 'tenant-abc'}));
        });
    });

    // The API error handler deep-clones whatever it is handed. A raw SDK
    // exception carries a circular reference to its HTTP response, so it used to
    // surface as "Maximum call stack size exceeded" and the real S3 failure
    // never reached the operator.
    describe('S3 failure reporting', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('reports the S3 error code, operation and key rather than the raw SDK error', async function () {
            const store = storeWithClient(async () => {
                throw s3Failure();
            });

            await assert.rejects(store.getAll(), (err: GhostErrorShape) => {
                assert.equal(err.errorType, 'InternalServerError');
                assert.equal(err.code, 'REDIRECTS_STORAGE_REQUEST_FAILED');
                assert.equal(err.context, 'Access denied.');
                assert.equal(err.errorDetails?.s3ErrorCode, 'AccessDenied');
                assert.equal(err.errorDetails?.statusCode, 403);
                assert.equal(err.errorDetails?.operation, 'GetObject');
                assert.equal(err.errorDetails?.key, CANONICAL_KEY);
                assert.doesNotThrow(() => JSON.stringify(err.errorDetails));
                return true;
            });
        });

        it('names CopyObject and the backup key when the backup fails', async function () {
            const store = storeWithClient(async (command) => {
                if (command instanceof CopyObjectCommand) {
                    throw s3Failure();
                }
                return {};
            });

            await assert.rejects(store.replaceAll([]), (err: GhostErrorShape) => {
                assert.equal(err.errorDetails?.operation, 'CopyObject');
                assert.match(String(err.errorDetails?.key), /^content\/data\/redirects-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
                return true;
            });
        });

        it('names PutObject and the canonical key when the write fails', async function () {
            const store = storeWithClient(async (command) => {
                if (command instanceof PutObjectCommand) {
                    throw s3Failure();
                }
                return {};
            });

            await assert.rejects(store.replaceAll([]), (err: GhostErrorShape) => {
                assert.equal(err.errorDetails?.operation, 'PutObject');
                assert.equal(err.errorDetails?.key, CANONICAL_KEY);
                return true;
            });
        });

        it('names HeadObject when the existence check fails', async function () {
            const store = storeWithClient(async (command) => {
                if (command instanceof HeadObjectCommand) {
                    throw s3Failure();
                }
                return {};
            });

            await assert.rejects(store.replaceAll([]), (err: GhostErrorShape) => {
                assert.equal(err.errorDetails?.operation, 'HeadObject');
                return true;
            });
        });
    });
});
