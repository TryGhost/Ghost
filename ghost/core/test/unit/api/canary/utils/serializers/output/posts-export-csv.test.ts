import assert from 'node:assert/strict';
import {Readable, Writable} from 'node:stream';
const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts');

describe('Unit: posts CSV export serializer', function () {
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
