import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Readable, Writable} from 'node:stream';
import * as papaparse from 'papaparse';
const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts');

describe('Unit: posts CSV export serializer', function () {
    it('Streams CSV response with headers', async function () {
        const data = [{id: '1', title: 'Post'}];
        const source = Readable.from(data, {objectMode: true});
        const frame: {response?: Function} = {};
        const headers: Record<string, string> = {};
        const chunks: Buffer[] = [];
        const nextCalls: unknown[] = [];

        postsSerializer.exportCSV({data: source}, null, frame);

        const response: any = new Writable({
            write(chunk: Buffer, _encoding: string, callback: Function) {
                chunks.push(chunk);
                callback();
            }
        });
        response.setHeader = (key: string, value: string) => {
            headers[key] = value;
        };
        response.getHeader = () => undefined;

        frame.response!(null, response, (err: unknown) => {
            nextCalls.push(err);
        });

        await once(response, 'finish');

        const expected = papaparse.unparse(data, {
            escapeFormulae: true,
            newline: '\r\n'
        });

        assert.equal(Buffer.concat(chunks).toString(), expected);
        assert.equal(headers['Content-Type'], 'text/csv; charset=utf-8');
        assert.match(headers['Content-Disposition'], /^Attachment; filename="post-analytics\.\d{4}-\d{2}-\d{2}\.csv"$/);
        assert.equal(headers['Cache-Control'], 'no-transform');
        assert.deepEqual(nextCalls, []);
    });

    it('Passes response stream errors to next', async function () {
        const sourceError = new Error('response failed');
        const source = Readable.from([{id: '1', title: 'Post'}], {objectMode: true});
        const frame: {response?: Function} = {};

        postsSerializer.exportCSV({data: source}, null, frame);

        const response: any = new Writable({
            write(_chunk: unknown, _encoding: string, callback: Function) {
                callback(sourceError);
            }
        });
        response.setHeader = () => {};
        response.getHeader = () => {};
        response.on('error', () => {});

        const err = await new Promise((resolve) => {
            frame.response!(null, response, resolve);
        });

        assert.equal(err, sourceError);
    });
});
