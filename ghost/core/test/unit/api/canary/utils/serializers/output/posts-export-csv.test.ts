import assert from 'node:assert/strict';
import {Readable, PassThrough, Writable} from 'stream';
import {createCSVTransform} from '../../../../../../../core/server/api/endpoints/utils/serializers/output/posts-csv-transform';
const papaparse = require('papaparse');
const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts');

describe('Unit: posts CSV streaming transform', function () {
    it('Transforms a stream of objects into CSV matching papaparse output', function (done) {
        const data = [
            {id: '1', title: 'First Post', status: 'published'},
            {id: '2', title: 'Second, "Quoted" Post', status: 'sent'}
        ];
        const source = Readable.from(data, {objectMode: true});
        const csvTransform = createCSVTransform();
        const collector = new PassThrough();
        let csvOutput = '';

        collector.on('data', (chunk: Buffer) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            const expected = papaparse.unparse(data, {
                escapeFormulae: true,
                newline: '\r\n'
            });

            assert.equal(csvOutput, expected);
            done();
        });

        source.pipe(csvTransform).pipe(collector);
    });

    it('Forwards transform errors to the stream pipeline', function (done) {
        const csvTransform = createCSVTransform();
        const boom = new Error('boom');

        csvTransform.on('error', (err: Error) => {
            assert.equal(err, boom);
            done();
        });
        csvTransform.on('data', () => {});

        // Object.keys(proxy) invokes the ownKeys trap, which throws —
        // exercises the catch in transform() on the first chunk.
        const exploding = new Proxy({}, {
            ownKeys() {
                throw boom;
            }
        });
        csvTransform.write(exploding);
    });

    it('Emits no output when the input stream is empty', function (done) {
        const source = Readable.from([], {objectMode: true});
        const csvTransform = createCSVTransform();
        let output = '';

        csvTransform.on('data', (chunk: Buffer) => {
            output += chunk.toString();
        });
        csvTransform.on('end', () => {
            assert.equal(output, '');
            done();
        });

        source.pipe(csvTransform);
    });
});

describe('Unit: posts CSV export serializer', function () {
    it('Passes response stream errors to next', function (done) {
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

        frame.response!(null, response, (err: unknown) => {
            assert.equal(err, sourceError);
            done();
        });
    });
});
