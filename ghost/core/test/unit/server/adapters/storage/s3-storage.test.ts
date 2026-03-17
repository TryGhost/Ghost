import assert from 'assert/strict';
import sinon from 'sinon';
import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import {
    DeleteObjectCommand,
    NotFound,
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    S3Client
} from '@aws-sdk/client-s3';
import S3Storage, {type S3StorageOptions} from '../../../../../core/server/adapters/storage/S3Storage';

// Minimum chunk size for multipart uploads (5 MiB) - required by S3/GCS
const MIN_MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;

const baseOptions: S3StorageOptions = {
    staticFileURLPrefix: 'content/files',
    bucket: 'test-bucket',
    region: 'us-east-1',
    tenantPrefix: 'configurable/prefix',
    cdnUrl: 'https://cdn.example.com',
    multipartUploadThresholdBytes: 10 * 1024 * 1024,
    multipartChunkSizeBytes: 10 * 1024 * 1024
};

type StubbedClient = Pick<S3Client, 'send'>;

const createNotFoundError = () => {
    return new NotFound({
        $metadata: {
            httpStatusCode: 404
        },
        message: 'The specified key does not exist.'
    });
};

describe('S3Storage', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createStorage(overrides: Record<string, unknown> = {}) {
        const sendStub = sinon.stub().resolves({});
        const client: StubbedClient = {
            send: sendStub
        };

        const storage = new S3Storage({
            ...baseOptions,
            ...overrides,
            s3Client: client as S3Client
        });

        return {storage, sendStub};
    }

    it('throws when required constructor options are missing', function () {
        assert.throws(() => {
            const options: any = {...baseOptions};
            delete options.bucket;
            new S3Storage(options);
        }, /requires a bucket name/);

        assert.throws(() => {
            const options: any = {...baseOptions};
            delete options.staticFileURLPrefix;
            new S3Storage(options);
        }, /requires a staticFileURLPrefix/);

        assert.throws(() => {
            const options: any = {...baseOptions};
            delete options.cdnUrl;
            new S3Storage(options);
        }, /requires a cdnUrl option/);

        assert.throws(() => {
            const options: any = {...baseOptions};
            delete options.multipartUploadThresholdBytes;
            new S3Storage(options);
        }, /requires multipartUploadThresholdBytes option/);

        assert.throws(() => {
            const options: any = {...baseOptions};
            delete options.multipartChunkSizeBytes;
            new S3Storage(options);
        }, /requires multipartChunkSizeBytes option/);
    });

    it('strips leading and trailing slashes from config options', function () {
        const {storage} = createStorage({
            tenantPrefix: '/client-a/',
            staticFileURLPrefix: '/content/files/',
            cdnUrl: 'https://cdn.example.com/'
        });

        assert.equal((storage as any).tenantPrefix, 'client-a');
        assert.equal((storage as any).storagePath, 'content/files');
        assert.equal((storage as any).cdnUrl, 'https://cdn.example.com');
    });

    it('uploads files with prefix and returns cdn url', async function () {
        const {storage, sendStub} = createStorage();

        sinon.stub(storage, 'exists').resolves(false);
        sinon.stub(fs.promises, 'stat').resolves({size: 512} as fs.Stats);
        sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('file-data'));

        const url = await storage.save({
            path: '/tmp/test-image.jpg',
            name: 'test-image.jpg'
        }, '2024/06');

        assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/2024/06/test-image.jpg');
        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as PutObjectCommand;
        assert.equal(command.input.Bucket, 'test-bucket');
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('save() uses getTargetDir() when targetDir not provided', async function () {
        const {storage, sendStub} = createStorage();

        sinon.stub(storage, 'exists').resolves(false);
        sinon.stub(fs.promises, 'stat').resolves({size: 512} as fs.Stats);
        sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('file-data'));

        const url = await storage.save({
            path: '/tmp/test-image.jpg',
            name: 'test-image.jpg'
        });

        assert.ok(url.startsWith('https://cdn.example.com/configurable/prefix/content/files/'));
        sinon.assert.calledOnce(sendStub);
    });

    it('saves raw buffers relative to storagePath', async function () {
        const {storage, sendStub} = createStorage();

        const url = await storage.saveRaw(Buffer.from('raw-data'), 'thumbnails/raw-image.jpg');

        assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/thumbnails/raw-image.jpg');
        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as PutObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/thumbnails/raw-image.jpg');
    });

    it('converts CDN urls back to relative paths (strips prefix and storagePath)', function () {
        const {storage} = createStorage();

        const key = storage.urlToPath('https://cdn.example.com/configurable/prefix/content/files/2024/06/test-image.jpg');

        assert.equal(key, '2024/06/test-image.jpg');
    });

    it('throws if url does not match CDN', function () {
        const {storage} = createStorage();

        assert.throws(() => {
            storage.urlToPath('https://malicious.example.com/evil.jpg');
        }, /not a valid URL/);
    });

    it('throws if url is missing expected tenant prefix', function () {
        const {storage} = createStorage();

        assert.throws(() => {
            storage.urlToPath('https://cdn.example.com/content/files/2024/06/image.jpg');
        }, /missing expected tenant prefix/);
    });

    it('throws if url is missing expected storagePath', function () {
        const {storage} = createStorage();

        assert.throws(() => {
            storage.urlToPath('https://cdn.example.com/configurable/prefix/2024/06/image.jpg');
        }, /missing expected storagePath/);
    });

    describe('serve middleware', function () {
        it('redirects to CDN URL with 301 status', function () {
            const {storage} = createStorage();

            const middleware = storage.serve();
            const req = {path: '/2024/06/video.mp4'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(
                res.redirect,
                301,
                'https://cdn.example.com/configurable/prefix/content/files/2024/06/video.mp4'
            );
            sinon.assert.notCalled(next);
        });

        it('redirects without tenant prefix when not configured', function () {
            const {storage} = createStorage({tenantPrefix: ''});

            const middleware = storage.serve();
            const req = {path: '/2024/06/podcast.mp3'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(
                res.redirect,
                301,
                'https://cdn.example.com/content/files/2024/06/podcast.mp3'
            );
            sinon.assert.notCalled(next);
        });

        it('handles deeply nested paths', function () {
            const {storage} = createStorage();

            const middleware = storage.serve();
            const req = {path: '/2024/06/subfolder/another/video.mp4'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(
                res.redirect,
                301,
                'https://cdn.example.com/configurable/prefix/content/files/2024/06/subfolder/another/video.mp4'
            );
        });

        it('preserves URL-encoded characters in path', function () {
            const {storage} = createStorage({tenantPrefix: ''});

            const middleware = storage.serve();
            const req = {path: '/2024/06/my%20file%20(1).mp4'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(
                res.redirect,
                301,
                'https://cdn.example.com/content/files/2024/06/my%20file%20(1).mp4'
            );
        });

        it('falls through to next middleware for empty path', function () {
            const {storage} = createStorage();

            const middleware = storage.serve();
            const req = {path: ''};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('falls through to next middleware for root path', function () {
            const {storage} = createStorage();

            const middleware = storage.serve();
            const req = {path: '/'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('strips leading slashes from path when building redirect URL', function () {
            const {storage} = createStorage({tenantPrefix: ''});

            const middleware = storage.serve();
            const req = {path: '///2024/06/file.mp4'};
            const res = {redirect: sinon.stub()};
            const next = sinon.stub();

            middleware(req as any, res as any, next);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(
                res.redirect,
                301,
                'https://cdn.example.com/content/files/2024/06/file.mp4'
            );
        });
    });

    it('exists resolves based on S3 head object responses', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.resolves({});
        const exists = await storage.exists('test-image.jpg', '2024/06');
        assert.equal(exists, true);

        sendStub.resetHistory();
        sendStub.rejects(createNotFoundError());
        const missing = await storage.exists('missing.jpg', '2024/06');
        assert.equal(missing, false);
    });

    it('delete removes objects using derived key', async function () {
        const {storage, sendStub} = createStorage();

        await storage.delete('test-image.jpg', '2024/06');

        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as DeleteObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('delete ignores missing objects', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.rejects(createNotFoundError());

        await storage.delete('ghost.txt', 'content/files');
        sinon.assert.calledOnce(sendStub);
    });

    it('exists rethrows unexpected S3 errors', async function () {
        const {storage, sendStub} = createStorage();
        sendStub.rejects(new Error('boom'));

        await assert.rejects(storage.exists('bad.txt', '2024/06'), /boom/);
    });

    it('saveRaw throws when targetPath is empty', async function () {
        const {storage} = createStorage();

        await assert.rejects(
            storage.saveRaw(Buffer.from('data'), ''),
            /requires a non-empty targetPath/
        );
    });

    it('exists throws when fileName is empty', async function () {
        const {storage} = createStorage();

        await assert.rejects(
            storage.exists('', '2024/06'),
            /requires a non-empty fileName/
        );
    });

    it('delete throws when fileName is empty', async function () {
        const {storage} = createStorage();

        await assert.rejects(
            storage.delete('', '2024/06'),
            /requires a non-empty fileName/
        );
    });

    it('handles thumbnail upload flow (urlToPath → dirname → save)', async function () {
        const {storage, sendStub} = createStorage();

        sinon.stub(storage, 'exists').resolves(false);
        sinon.stub(fs.promises, 'stat').resolves({size: 512} as fs.Stats);
        sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('file-data'));

        const videoUrl = await storage.save({
            path: '/tmp/video.mp4',
            name: 'video.mp4'
        });

        assert.ok(videoUrl.includes('/content/files/'));

        const videoCommand = sendStub.firstCall.args[0] as PutObjectCommand;
        const videoKey = videoCommand.input.Key;

        const videoPath = storage.urlToPath(videoUrl);
        const targetDir = path.dirname(videoPath);

        sendStub.resetHistory();
        await storage.save({
            path: '/tmp/thumbnail.jpg',
            name: 'thumbnail.jpg'
        }, targetDir);

        const thumbnailCommand = sendStub.firstCall.args[0] as PutObjectCommand;
        const expectedThumbnailKey = videoKey?.replace('video.mp4', 'thumbnail.jpg');

        assert.equal(thumbnailCommand.input.Key, expectedThumbnailKey);
    });

    it('handles ExternalMediaInliner flow (getTargetDir → getUniqueFileName → path.relative → saveRaw)', async function () {
        const {storage, sendStub} = createStorage();

        sinon.stub(storage, 'exists').resolves(false);

        const storagePath = (storage as any).storagePath;
        const targetDir = storage.getTargetDir(storagePath);
        const uniqueFileName = await storage.getUniqueFileName({
            name: 'external-image.jpg',
            path: '/tmp/external-image.jpg'
        }, targetDir);
        const targetPath = path.relative(storagePath, uniqueFileName);

        await storage.saveRaw(Buffer.from('external-data'), targetPath);

        const command = sendStub.firstCall.args[0] as PutObjectCommand;
        assert.ok(command.input.Key?.startsWith('configurable/prefix/content/files/'));
        assert.ok(!command.input.Key?.includes('content/files/content/files'));
    });

    it('buildKey always adds storagePath and tenant prefix', function () {
        const {storage} = createStorage();

        const relativePath = '2024/06/image.jpg';
        const key = (storage as any).buildKey(relativePath);

        assert.equal(key, 'configurable/prefix/content/files/2024/06/image.jpg');
    });

    it('buildKey works without tenant prefix', function () {
        const {storage} = createStorage({tenantPrefix: ''});

        const relativePath = '2024/06/image.jpg';
        const key = (storage as any).buildKey(relativePath);

        assert.equal(key, 'content/files/2024/06/image.jpg');
    });

    it('buildKey throws on empty path', function () {
        const {storage} = createStorage();

        assert.throws(() => {
            (storage as any).buildKey('');
        }, /requires a non-empty relativePath/);
    });

    it('read() throws as it is not supported', async function () {
        const {storage} = createStorage();

        await assert.rejects(
            storage.read(),
            /read\(\) is not supported by S3Storage/
        );
    });

    describe('Multipart Upload', function () {
        function createMockReadStream(fileContent: Buffer) {
            return Readable.from(fileContent);
        }

        it('uses simple upload for files below threshold', async function () {
            const {storage, sendStub} = createStorage({multipartUploadThresholdBytes: 1024});

            const smallFileContent = Buffer.alloc(512, 'x');
            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: 512} as fs.Stats);
            sinon.stub(fs.promises, 'readFile').resolves(smallFileContent);

            const url = await storage.save({
                path: '/tmp/small-file.mp4',
                name: 'small-file.mp4',
                type: 'video/mp4'
            }, '2024/06');

            assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/2024/06/small-file.mp4');
            sinon.assert.calledOnce(sendStub);
            const command = sendStub.firstCall.args[0];
            assert.ok(command instanceof PutObjectCommand);
            assert.equal(command.input.ContentType, 'video/mp4');
        });

        it('uses multipart upload for files at or above threshold', async function () {
            const partSize = MIN_MULTIPART_CHUNK_SIZE;
            const fileSize = partSize * 2;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE,
                multipartChunkSizeBytes: partSize
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    return {ETag: `"etag-part-${(command as UploadPartCommand).input.PartNumber}"`};
                }
                if (command instanceof CompleteMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            const url = await storage.save({
                path: '/tmp/large-file.mp4',
                name: 'large-file.mp4',
                type: 'video/mp4'
            }, '2024/06');

            assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/2024/06/large-file.mp4');

            // Verify CreateMultipartUploadCommand
            const createCommand = sendStub.getCall(0).args[0];
            assert.ok(createCommand instanceof CreateMultipartUploadCommand);
            assert.equal(createCommand.input.Bucket, 'test-bucket');
            assert.equal(createCommand.input.ContentType, 'video/mp4');

            // Verify UploadPartCommands
            const part1Command = sendStub.getCall(1).args[0];
            assert.ok(part1Command instanceof UploadPartCommand);
            assert.equal(part1Command.input.PartNumber, 1);
            assert.equal(part1Command.input.UploadId, 'test-upload-id');

            const part2Command = sendStub.getCall(2).args[0];
            assert.ok(part2Command instanceof UploadPartCommand);
            assert.equal(part2Command.input.PartNumber, 2);

            // Verify CompleteMultipartUploadCommand
            const completeCommand = sendStub.getCall(3).args[0];
            assert.ok(completeCommand instanceof CompleteMultipartUploadCommand);
            assert.equal(completeCommand.input.UploadId, 'test-upload-id');
            assert.deepEqual(completeCommand.input.MultipartUpload?.Parts, [
                {ETag: '"etag-part-1"', PartNumber: 1},
                {ETag: '"etag-part-2"', PartNumber: 2}
            ]);
        });

        it('throws error when CreateMultipartUpload returns no UploadId', async function () {
            const {storage, sendStub} = createStorage({multipartUploadThresholdBytes: 1024});

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: 2048} as fs.Stats);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {}; // No UploadId
                }
                return {};
            });

            await assert.rejects(
                storage.save({
                    path: '/tmp/large-file.mp4',
                    name: 'large-file.mp4'
                }, '2024/06'),
                /Failed to initiate file upload/
            );
        });

        it('throws error when UploadPart returns no ETag', async function () {
            const fileSize = MIN_MULTIPART_CHUNK_SIZE * 2;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE,
                multipartChunkSizeBytes: MIN_MULTIPART_CHUNK_SIZE
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    return {}; // No ETag
                }
                if (command instanceof AbortMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            await assert.rejects(
                storage.save({
                    path: '/tmp/large-file.mp4',
                    name: 'large-file.mp4'
                }, '2024/06'),
                /Failed to upload file part 1/
            );

            // Verify abort was called
            const abortCall = sendStub.getCalls().find(call => call.args[0] instanceof AbortMultipartUploadCommand);
            assert.ok(abortCall, 'AbortMultipartUploadCommand should have been called');
            assert.equal(abortCall.args[0].input.UploadId, 'test-upload-id');
        });

        it('aborts multipart upload when part upload fails with S3 error', async function () {
            const fileSize = MIN_MULTIPART_CHUNK_SIZE * 2;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE,
                multipartChunkSizeBytes: MIN_MULTIPART_CHUNK_SIZE
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    throw new Error('S3 network error');
                }
                if (command instanceof AbortMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            await assert.rejects(
                storage.save({
                    path: '/tmp/large-file.mp4',
                    name: 'large-file.mp4'
                }, '2024/06'),
                /S3 network error/
            );

            // Verify abort was called
            const abortCall = sendStub.getCalls().find(call => call.args[0] instanceof AbortMultipartUploadCommand);
            assert.ok(abortCall, 'AbortMultipartUploadCommand should have been called');
            assert.equal(abortCall.args[0].input.UploadId, 'test-upload-id');
            assert.equal(abortCall.args[0].input.Key, 'configurable/prefix/content/files/2024/06/large-file.mp4');
        });

        it('continues to throw original error when abort also fails', async function () {
            const fileSize = MIN_MULTIPART_CHUNK_SIZE * 2;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE,
                multipartChunkSizeBytes: MIN_MULTIPART_CHUNK_SIZE
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    throw new Error('Original upload error');
                }
                if (command instanceof AbortMultipartUploadCommand) {
                    throw new Error('Abort also failed');
                }
                return {};
            });

            // Should throw the original error, not the abort error
            await assert.rejects(
                storage.save({
                    path: '/tmp/large-file.mp4',
                    name: 'large-file.mp4'
                }, '2024/06'),
                /Original upload error/
            );
        });

        it('does not call abort if upload fails before getting uploadId', async function () {
            const fileSize = MIN_MULTIPART_CHUNK_SIZE * 2;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE
            });

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    throw new Error('Failed to create multipart upload');
                }
                return {};
            });

            await assert.rejects(
                storage.save({
                    path: '/tmp/large-file.mp4',
                    name: 'large-file.mp4'
                }, '2024/06'),
                /Failed to create multipart upload/
            );

            // Verify abort was NOT called
            const abortCall = sendStub.getCalls().find(call => call.args[0] instanceof AbortMultipartUploadCommand);
            assert.ok(!abortCall, 'AbortMultipartUploadCommand should NOT have been called');
        });

        it('handles file exactly at threshold using multipart', async function () {
            const threshold = MIN_MULTIPART_CHUNK_SIZE;
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: threshold,
                multipartChunkSizeBytes: threshold
            });

            const fileContent = Buffer.alloc(threshold, 'x'); // Exactly at threshold

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: threshold} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    return {ETag: '"etag"'};
                }
                if (command instanceof CompleteMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            const url = await storage.save({
                path: '/tmp/exact-threshold.mp4',
                name: 'exact-threshold.mp4'
            }, '2024/06');

            assert.ok(url.includes('exact-threshold.mp4'));

            // Should use multipart (CreateMultipartUpload was called)
            const createCall = sendStub.getCalls().find(call => call.args[0] instanceof CreateMultipartUploadCommand);
            assert.ok(createCall, 'Should use multipart upload for files at threshold');
        });

        it('handles file just below threshold using simple upload', async function () {
            const threshold = MIN_MULTIPART_CHUNK_SIZE;
            const {storage, sendStub} = createStorage({multipartUploadThresholdBytes: threshold});

            const fileContent = Buffer.alloc(threshold - 1, 'x'); // Just below threshold

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: threshold - 1} as fs.Stats);
            sinon.stub(fs.promises, 'readFile').resolves(fileContent);

            const url = await storage.save({
                path: '/tmp/below-threshold.mp4',
                name: 'below-threshold.mp4'
            }, '2024/06');

            assert.ok(url.includes('below-threshold.mp4'));

            // Should use simple upload (PutObjectCommand was called)
            sinon.assert.calledOnce(sendStub);
            const command = sendStub.firstCall.args[0];
            assert.ok(command instanceof PutObjectCommand);
        });

        it('respects custom multipartThreshold and partSize options', async function () {
            const customPartSize = MIN_MULTIPART_CHUNK_SIZE;
            const customThreshold = MIN_MULTIPART_CHUNK_SIZE;
            const fileSize = customPartSize * 3; // 3 parts
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: customThreshold,
                multipartChunkSizeBytes: customPartSize
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    return {ETag: `"etag-${(command as UploadPartCommand).input.PartNumber}"`};
                }
                if (command instanceof CompleteMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            await storage.save({
                path: '/tmp/custom-parts.mp4',
                name: 'custom-parts.mp4'
            }, '2024/06');

            // Should have: CreateMultipartUpload + 3 UploadPart + CompleteMultipartUpload = 5 calls
            sinon.assert.callCount(sendStub, 5);

            // Verify 3 parts were uploaded
            const uploadPartCalls = sendStub.getCalls().filter(call => call.args[0] instanceof UploadPartCommand);
            assert.equal(uploadPartCalls.length, 3);
        });

        it('handles last part being smaller than partSize', async function () {
            const partSize = MIN_MULTIPART_CHUNK_SIZE;
            const lastPartSize = Math.floor(partSize / 2); // Half a part
            const fileSize = partSize + lastPartSize; // 1.5 parts
            const {storage, sendStub} = createStorage({
                multipartUploadThresholdBytes: MIN_MULTIPART_CHUNK_SIZE,
                multipartChunkSizeBytes: partSize
            });

            const fileContent = Buffer.alloc(fileSize, 'x');

            sinon.stub(storage, 'exists').resolves(false);
            sinon.stub(fs.promises, 'stat').resolves({size: fileSize} as fs.Stats);
            sinon.stub(fs, 'createReadStream').returns(createMockReadStream(fileContent) as unknown as fs.ReadStream);

            const uploadedParts: {partNumber: number; size: number}[] = [];

            sendStub.callsFake(async (command: unknown) => {
                if (command instanceof CreateMultipartUploadCommand) {
                    return {UploadId: 'test-upload-id'};
                }
                if (command instanceof UploadPartCommand) {
                    const body = command.input.Body as Buffer;
                    uploadedParts.push({
                        partNumber: command.input.PartNumber!,
                        size: body.length
                    });
                    return {ETag: `"etag-${command.input.PartNumber}"`};
                }
                if (command instanceof CompleteMultipartUploadCommand) {
                    return {};
                }
                return {};
            });

            await storage.save({
                path: '/tmp/uneven-file.mp4',
                name: 'uneven-file.mp4'
            }, '2024/06');

            // Verify part sizes
            assert.equal(uploadedParts.length, 2);
            assert.equal(uploadedParts[0].size, partSize); // First part is full size
            assert.equal(uploadedParts[1].size, lastPartSize); // Last part is smaller
        });

        it('throws error when multipartChunkSizeBytes is less than 5 MiB', function () {
            assert.throws(() => {
                createStorage({
                    multipartChunkSizeBytes: 1024 // Less than 5 MiB
                });
            }, /multipartChunkSizeBytes must be at least 5 MiB/);
        });
    });
});
