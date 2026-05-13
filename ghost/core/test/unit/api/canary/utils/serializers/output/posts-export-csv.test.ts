import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Readable, Writable} from 'node:stream';
import {text} from 'node:stream/consumers';
import {createCSVTransform} from '../../../../../../../core/server/api/endpoints/utils/serializers/output/posts-csv-transform';
import * as papaparse from 'papaparse';
const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts');

describe('Unit: posts CSV streaming transform', function () {
    it('Transforms a stream of objects into CSV matching papaparse output', async function () {
        const data = [
            {id: '1', title: 'First Post', status: 'published'},
            {id: '2', title: 'Second, "Quoted" Post', status: 'sent'}
        ];
        const source = Readable.from(data, {objectMode: true});
        const csvTransform = createCSVTransform();

        source.pipe(csvTransform);

        const csvOutput = await text(csvTransform);

        const expected = papaparse.unparse(data, {
            escapeFormulae: true,
            newline: '\r\n'
        });
        assert.equal(csvOutput, expected);
    });

    it('Forwards transform errors to the stream pipeline', async function () {
        const csvTransform = createCSVTransform();
        const boom = new Error('boom');
        const errorPromise = once(csvTransform, 'error');

        csvTransform.on('data', () => {});

        // Object.keys(proxy) invokes the ownKeys trap, which throws —
        // exercises the catch in transform() on the first chunk.
        const exploding = new Proxy({}, {
            ownKeys() {
                throw boom;
            }
        });
        csvTransform.write(exploding);

        const [err] = await errorPromise;
        assert.equal(err, boom);
    });

    it('Emits no output when the input stream is empty', async function () {
        const source = Readable.from([], {objectMode: true});
        const csvTransform = createCSVTransform();

        source.pipe(csvTransform);

        const output = await text(csvTransform);
        assert.equal(output, '');
    });
});

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
