import assert from 'node:assert/strict';
import sinon from 'sinon';
import {CopyObjectCommand, HeadObjectCommand, NoSuchKey, NotFound, PutObjectCommand, type S3Client} from '@aws-sdk/client-s3';
import {utils as errorUtils} from '@tryghost/errors';

import S3RedirectsStore from '../../../../../core/server/adapters/redirects/S3RedirectsStore';
import {s3Failure} from '../../../../utils/s3-failure';

const BUCKET = 'a-bucket';
const CANONICAL_KEY = 'content/data/redirects.json';
const BACKUP_KEY = /^content\/data\/redirects-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;

interface GhostErrorShape {
    errorType?: string;
    message?: string;
    code?: string;
    context?: string;
    help?: string;
    errorDetails?: {
        operation?: string;
        bucket?: string;
        key?: string;
        s3ErrorCode?: string;
        statusCode?: number;
        requestId?: string;
    };
}

const accessDenied = () => s3Failure({message: 'Access denied.', httpStatusCode: 403});

const storeWithClient = (send: (command: unknown) => Promise<unknown>) => {
    const client: Pick<S3Client, 'send'> = {send: sinon.stub().callsFake(send)};
    return new S3RedirectsStore({
        bucket: BUCKET,
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

    describe('getAll', function () {
        // An empty bucket is the normal state for a site with no redirects, so
        // it must stay a clean empty list rather than becoming a failure.
        it('returns no redirects when the object does not exist', async function () {
            const store = storeWithClient(async () => {
                throw new NoSuchKey({$metadata: {httpStatusCode: 404}, message: 'The specified key does not exist.'});
            });

            assert.deepEqual(await store.getAll(), []);
        });

        it('treats the HeadObject flavour of missing as missing too', async function () {
            const store = storeWithClient(async () => {
                throw new NotFound({$metadata: {httpStatusCode: 404}, message: 'Not Found'});
            });

            assert.deepEqual(await store.getAll(), []);
        });
    });

    // The API error handler deep-clones whatever it is handed. A raw SDK
    // exception carries a circular reference to its HTTP response, so it used to
    // surface as "Maximum call stack size exceeded" and the real S3 failure
    // never reached the operator.
    describe('S3 failure reporting', function () {
        it('reports the S3 error code, operation and key rather than the raw SDK error', async function () {
            const store = storeWithClient(async () => {
                throw accessDenied();
            });

            await assert.rejects(store.getAll(), (err: GhostErrorShape) => {
                assert.equal(err.errorType, 'InternalServerError');
                assert.equal(err.message, 'Could not read redirects.json from storage: AccessDenied (GetObject).');
                assert.equal(err.code, 'REDIRECTS_STORAGE_REQUEST_FAILED');
                assert.equal(err.context, 'Access denied.');
                assert.equal(err.errorDetails?.s3ErrorCode, 'AccessDenied');
                assert.equal(err.errorDetails?.statusCode, 403);
                assert.equal(err.errorDetails?.operation, 'GetObject');
                // Naming the bucket is what makes a misconfigured one
                // diagnosable — the hint to check it is no use on its own.
                assert.equal(err.errorDetails?.bucket, BUCKET);
                assert.equal(err.errorDetails?.key, CANONICAL_KEY);
                // The point of the change: the API error handler deep-clones
                // the error before rendering it, and the raw SDK exception made
                // that recurse until the stack blew.
                assert.doesNotThrow(() => errorUtils.prepareStackForUser(err as Error));
                return true;
            });
        });

        it('names CopyObject and the backup key when the backup fails', async function () {
            const store = storeWithClient(async (command) => {
                if (command instanceof CopyObjectCommand) {
                    throw s3Failure({name: 'SlowDown', message: 'Please reduce your request rate.', httpStatusCode: 503, requestId: 'REQ-1'});
                }
                return {};
            });

            await assert.rejects(store.replaceAll([]), (err: GhostErrorShape) => {
                // A failed backup is still a failed save, and the key tells the
                // operator it was the backup rather than the canonical object.
                assert.equal(err.message, 'Could not save redirects.json to storage: SlowDown (CopyObject).');
                assert.equal(err.errorDetails?.operation, 'CopyObject');
                assert.match(String(err.errorDetails?.key), BACKUP_KEY);
                assert.equal(err.errorDetails?.requestId, 'REQ-1');
                assert.match(String(err.help), /temporarily unavailable/);
                return true;
            });
        });

        // The request never reaches S3, so there is no service error code to
        // report — only the errno says what happened.
        it('reports the errno when the storage service cannot be reached', async function () {
            const store = storeWithClient(async () => {
                throw Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:443'), {code: 'ECONNREFUSED'});
            });

            await assert.rejects(store.getAll(), (err: GhostErrorShape) => {
                assert.equal(err.message, 'Could not read redirects.json from storage: ECONNREFUSED (GetObject).');
                assert.match(String(err.help), /could not reach the storage service/);
                return true;
            });
        });

        // The body is streamed after the request that opened it succeeds, so a
        // reset partway through rejects separately, with nothing on it to
        // identify the failure by.
        it('reports a body-stream failure against GetObject', async function () {
            const store = storeWithClient(async () => ({
                Body: {
                    transformToString: async () => {
                        throw new Error('aborted');
                    }
                }
            }));

            await assert.rejects(store.getAll(), (err: GhostErrorShape) => {
                assert.equal(err.message, 'Could not read redirects.json from storage: UnknownError (GetObject).');
                assert.equal(err.context, 'aborted');
                assert.equal(err.help, undefined);
                return true;
            });
        });

        it('names PutObject and the canonical key when the write fails', async function () {
            const store = storeWithClient(async (command) => {
                if (command instanceof PutObjectCommand) {
                    throw accessDenied();
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
                    throw accessDenied();
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
