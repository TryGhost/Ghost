import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Readable, Writable} from 'node:stream';
const membersSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/members');

function makeResponse(headers: Record<string, string>, chunks: Buffer[] = []) {
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
    return response;
}

describe('Unit: members CSV export serializer', function () {
    it('Streams CSV response using the filename provided by the endpoint', async function () {
        const source = Readable.from([{id: '1', email: 'jamie@example.com'}], {objectMode: true});
        const frame: {response?: Function} = {};
        const headers: Record<string, string> = {};
        const chunks: Buffer[] = [];
        const nextCalls: unknown[] = [];

        membersSerializer.exportCSV({data: source, filename: 'my-site.ghost.members.2026-06-02.csv'}, null, frame);

        const response = makeResponse(headers, chunks);
        frame.response!(null, response, (err: unknown) => {
            nextCalls.push(err);
        });

        await once(response, 'finish');

        assert.equal(headers['Content-Type'], 'text/csv; charset=utf-8');
        assert.equal(headers['Content-Disposition'], 'Attachment; filename="my-site.ghost.members.2026-06-02.csv"');
        assert.equal(headers['Cache-Control'], 'no-transform');
        // The CSV header row should have been written through the transform
        assert.match(Buffer.concat(chunks).toString(), /^id,email,name,note/);
        assert.deepEqual(nextCalls, []);
    });

    it('Falls back to the legacy filename when the endpoint does not provide one', async function () {
        const source = Readable.from([{id: '1', email: 'jamie@example.com'}], {objectMode: true});
        const frame: {response?: Function} = {};
        const headers: Record<string, string> = {};

        membersSerializer.exportCSV({data: source}, null, frame);

        const response = makeResponse(headers);
        frame.response!(null, response, () => {});

        await once(response, 'finish');

        assert.match(headers['Content-Disposition'], /^Attachment; filename="members\.\d{4}-\d{2}-\d{2}\.csv"$/);
    });

    it('Passes response stream errors to next', async function () {
        const sourceError = new Error('response failed');
        const source = Readable.from([{id: '1', email: 'jamie@example.com'}], {objectMode: true});
        const frame: {response?: Function} = {};

        membersSerializer.exportCSV({data: source, filename: 'my-site.ghost.members.2026-06-02.csv'}, null, frame);

        const response: any = new Writable({
            write(_chunk: unknown, _encoding: string, callback: Function) {
                callback(sourceError);
            }
        });
        response.setHeader = () => {};
        response.getHeader = () => undefined;
        response.on('error', () => {});

        const err = await new Promise((resolve) => {
            frame.response!(null, response, resolve);
        });

        assert.equal(err, sourceError);
    });

    it('Returns a CSV string for non-stream (array) data', function () {
        const frame: {response?: unknown} = {};
        membersSerializer.exportCSV({data: [{id: '1', email: 'jamie@example.com'}]}, null, frame);

        assert.equal(typeof frame.response, 'string');
        assert.match(frame.response as string, /jamie@example\.com/);
    });
});
