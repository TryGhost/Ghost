import assert from 'assert/strict';
import sinon from 'sinon';
import {Readable} from 'stream';
import fs from 'fs';
import path from 'path';
import {
    DeleteObjectCommand,
    NotFound,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import S3Storage, {type S3StorageOptions} from '../../../../../core/server/adapters/storage/S3Storage';

const baseOptions: S3StorageOptions = {
    staticFileURLPrefix: 'content/files',
    bucket: 'test-bucket',
    region: 'us-east-1',
    tenantPrefix: 'configurable/prefix',
    cdnUrl: 'https://cdn.example.com'
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
        sinon.stub(fs, 'createReadStream').returns(Readable.from('file-data') as unknown as fs.ReadStream);

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
        sinon.stub(fs, 'createReadStream').returns(Readable.from('file-data') as unknown as fs.ReadStream);

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

    it('serve middleware short-circuits to next handler', function (done) {
        const {storage} = createStorage();

        const middleware = storage.serve();
        middleware({} as any, {} as any, () => {
            done();
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
        assert.equal(sendStub.callCount, 1);
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
        sinon.stub(fs, 'createReadStream').returns(Readable.from('file-data') as unknown as fs.ReadStream);

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
});
