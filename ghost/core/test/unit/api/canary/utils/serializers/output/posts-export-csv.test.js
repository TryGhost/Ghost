const assert = require('node:assert/strict');
const {Readable, PassThrough, Writable} = require('stream');
const papaparse = require('papaparse');

describe('Unit: posts CSV streaming transform', function () {
    it('Transforms a stream of objects into CSV matching papaparse output', function (done) {
        const data = [
            {id: '1', title: 'First Post', status: 'published'},
            {id: '2', title: 'Second, "Quoted" Post', status: 'sent'}
        ];
        const source = Readable.from(data, {objectMode: true});
        const {createCSVTransform} = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts-csv-transform');
        const csvTransform = createCSVTransform();
        const collector = new PassThrough();
        let csvOutput = '';

        collector.on('data', (chunk) => {
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
});

describe('Unit: posts CSV export serializer', function () {
    it('Passes response stream errors to next', function (done) {
        const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts');
        const sourceError = new Error('response failed');
        const source = Readable.from([{id: '1', title: 'Post'}], {objectMode: true});
        const frame = {};

        postsSerializer.exportCSV({data: source}, null, frame);

        const response = new Writable({
            write(chunk, encoding, callback) {
                callback(sourceError);
            }
        });
        response.setHeader = () => {};
        response.getHeader = () => {};
        response.on('error', () => {});

        frame.response(null, response, (err) => {
            assert.equal(err, sourceError);
            done();
        });
    });
});
