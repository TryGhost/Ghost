import assert from 'assert/strict';
import sinon from 'sinon';
import {Readable} from 'stream';
import fs from 'fs';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import errors from '@tryghost/errors';
import S3Storage, {type S3StorageOptions} from '../../../../../core/server/adapters/storage/S3Storage';

const baseOptions: S3StorageOptions = {
    staticFileURLPrefix: 'content/files',
    bucket: 'test-bucket',
    region: 'us-east-1',
    prefix: 'configurable/prefix',
    cdnUrl: 'https://cdn.example.com'
};

type StubbedClient = Pick<S3Client, 'send'>;

const createNotFoundError = () => {
    const error = new Error('NotFound');
    (error as any).$metadata = {
        httpStatusCode: 404
    };
    (error as any).name = 'NotFound';
    return error;
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

    it('uploads files with prefix and returns cdn url', async function () {
        const {storage, sendStub} = createStorage();

        sinon.stub(storage as any, 'getUniqueFileName').resolves('content/files/2024/06/test-image.jpg');
        sinon.stub(fs, 'createReadStream').returns(Readable.from('file-data') as unknown as fs.ReadStream);

        const url = await storage.save({
            path: '/tmp/test-image.jpg',
            name: 'test-image.jpg'
        }, 'content/files/2024/06');

        assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/2024/06/test-image.jpg');
        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as PutObjectCommand;
        assert.equal(command.input.Bucket, 'test-bucket');
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('saves raw buffers relative to storagePath', async function () {
        const {storage, sendStub} = createStorage();

        const url = await storage.saveRaw(Buffer.from('raw-data'), 'thumbnails/raw-image.jpg');

        assert.equal(url, 'https://cdn.example.com/configurable/prefix/content/files/thumbnails/raw-image.jpg');
        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as PutObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/thumbnails/raw-image.jpg');
    });

    it('converts CDN urls back to object keys', function () {
        const {storage} = createStorage();

        const key = storage.urlToPath('https://cdn.example.com/configurable/prefix/content/files/2024/06/test-image.jpg');

        assert.equal(key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('trims whitespace before validating CDN urls', function () {
        const {storage} = createStorage();
        const key = storage.urlToPath('   https://cdn.example.com/configurable/prefix/content/files/2024/06/test-image.jpg   ');
        assert.equal(key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('throws if url does not match known prefixes', function () {
        const {storage} = createStorage();

        assert.throws(() => {
            storage.urlToPath('https://malicious.example.com/evil.jpg');
        }, /not a valid URL/);
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
        const exists = await storage.exists('test-image.jpg', 'content/files/2024/06');
        assert.equal(exists, true);

        sendStub.resetHistory();
        sendStub.rejects(createNotFoundError());
        const missing = await storage.exists('missing.jpg', 'content/files/2024/06');
        assert.equal(missing, false);
    });

    it('delete removes objects using derived key', async function () {
        const {storage, sendStub} = createStorage();

        await storage.delete('test-image.jpg', 'content/files/2024/06');

        sinon.assert.calledOnce(sendStub);
        const command = sendStub.firstCall.args[0] as DeleteObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('read returns buffers from S3 objects', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.resolves({
            Body: Readable.from('hello-world')
        });

        const buffer = await storage.read('test-image.jpg', 'content/files/2024/06');
        assert.equal(buffer.toString(), 'hello-world');

        const command = sendStub.firstCall.args[0] as GetObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/06/test-image.jpg');
    });

    it('read accepts legacy options signatures', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.resolves({
            Body: Readable.from('legacy-path')
        });

        const buffer = await storage.read({path: '2024/07/legacy.jpg'});
        assert.equal(buffer.toString(), 'legacy-path');

        const command = sendStub.firstCall.args[0] as GetObjectCommand;
        assert.equal(command.input.Key, 'configurable/prefix/content/files/2024/07/legacy.jpg');
    });

    it('read handles different body shapes', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.onCall(0).resolves({Body: Buffer.from('buffer-body')});
        let buffer = await storage.read('a.txt', 'content/files');
        assert.equal(buffer.toString(), 'buffer-body');

        sendStub.onCall(1).resolves({Body: 'string-body'});
        buffer = await storage.read('b.txt', 'content/files');
        assert.equal(buffer.toString(), 'string-body');

        sendStub.onCall(2).resolves({Body: new Uint8Array(Buffer.from('uint8-body'))});
        buffer = await storage.read('c.txt', 'content/files');
        assert.equal(buffer.toString(), 'uint8-body');
    });

    it('read throws NotFoundError when S3 reports missing object', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.rejects(createNotFoundError());

        await assert.rejects(storage.read('missing.txt'), (err: unknown) => {
            assert.ok(err instanceof errors.NotFoundError);
            assert.match((err as Error).message, /missing\.txt/);
            return true;
        });
    });

    it('read wraps unexpected S3 errors', async function () {
        const {storage, sendStub} = createStorage();

        sendStub.rejects(new Error('kaboom'));

        await assert.rejects(storage.read('broken.txt'), (err: unknown) => {
            assert.ok(err instanceof errors.InternalServerError);
            assert.match((err as Error).message, /Could not read file/);
            return true;
        });
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

        await assert.rejects(storage.exists('bad.txt'), /boom/);
    });
});
