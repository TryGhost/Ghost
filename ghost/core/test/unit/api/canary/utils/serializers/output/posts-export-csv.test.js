const assert = require('node:assert/strict');
const {Readable, PassThrough} = require('stream');
const papaparse = require('papaparse');

/**
 * Create a CSV Transform stream for posts export (matching the production implementation pattern)
 * This is the function we will implement in the serializer.
 */
function createPostsCSVTransform() {
    // Require from production code
    const postsSerializer = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/posts-csv-transform');
    return postsSerializer.createCSVTransform();
}

describe('Unit: posts CSV streaming transform', function () {
    it('Transforms stream of objects into CSV with headers', function (done) {
        const stream = new Readable({
            objectMode: true,
            read() {
                this.push({id: '1', title: 'Post One', url: 'https://example.com/one'});
                this.push({id: '2', title: 'Post Two', url: 'https://example.com/two'});
                this.push(null);
            }
        });

        const csvTransform = createPostsCSVTransform();

        let csvOutput = '';
        const collector = new PassThrough();
        collector.on('data', (chunk) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            // Should contain headers
            assert.ok(csvOutput.includes('id'), 'CSV should include id header');
            assert.ok(csvOutput.includes('title'), 'CSV should include title header');
            assert.ok(csvOutput.includes('url'), 'CSV should include url header');
            // Should contain data
            assert.ok(csvOutput.includes('Post One'), 'CSV should include first post title');
            assert.ok(csvOutput.includes('Post Two'), 'CSV should include second post title');
            // Parse the CSV and verify structure
            const parsed = papaparse.parse(csvOutput.trim(), {header: true});
            assert.equal(parsed.data.length, 2);
            assert.equal(parsed.data[0].id, '1');
            assert.equal(parsed.data[0].title, 'Post One');
            assert.equal(parsed.data[1].id, '2');
            assert.equal(parsed.data[1].title, 'Post Two');
            done();
        });

        stream.pipe(csvTransform).pipe(collector);
    });

    it('Handles a single record', function (done) {
        const stream = new Readable({
            objectMode: true,
            read() {
                this.push({id: '1', title: 'Only Post', sends: 100});
                this.push(null);
            }
        });

        const csvTransform = createPostsCSVTransform();

        let csvOutput = '';
        const collector = new PassThrough();
        collector.on('data', (chunk) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            const parsed = papaparse.parse(csvOutput.trim(), {header: true});
            assert.equal(parsed.data.length, 1);
            assert.equal(parsed.data[0].title, 'Only Post');
            assert.equal(parsed.data[0].sends, '100');
            done();
        });

        stream.pipe(csvTransform).pipe(collector);
    });

    it('Stream pipeline produces same CSV as papaparse.unparse for equivalent data', function (done) {
        const data = [
            {id: '1', title: 'First Post', status: 'published'},
            {id: '2', title: 'Second Post', status: 'draft'},
            {id: '3', title: 'Third, "Quoted" Post', status: 'sent'}
        ];

        const expected = papaparse.unparse(data, {
            escapeFormulae: true,
            newline: '\r\n'
        });

        // Clone data for the stream since we'll consume it
        const streamData = data.map(d => ({...d}));
        let i = 0;
        const stream = new Readable({
            objectMode: true,
            read() {
                if (i < streamData.length) {
                    this.push(streamData[i]);
                    i += 1;
                } else {
                    this.push(null);
                }
            }
        });

        const csvTransform = createPostsCSVTransform();

        let csvOutput = '';
        const collector = new PassThrough();
        collector.on('data', (chunk) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            assert.equal(csvOutput.trim(), expected.trim());
            done();
        });

        stream.pipe(csvTransform).pipe(collector);
    });

    it('Uses CRLF line endings for Windows compatibility', function (done) {
        const stream = new Readable({
            objectMode: true,
            read() {
                this.push({id: '1', title: 'Post'});
                this.push(null);
            }
        });

        const csvTransform = createPostsCSVTransform();

        let csvOutput = '';
        const collector = new PassThrough();
        collector.on('data', (chunk) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            assert.ok(csvOutput.includes('\r\n'), 'CSV should use CRLF line endings');
            done();
        });

        stream.pipe(csvTransform).pipe(collector);
    });
});
