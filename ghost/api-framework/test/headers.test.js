const shared = require('../');
const Frame = require('../lib/Frame');

describe('Headers', function () {
    it('empty headers config', function () {
        return shared.headers.get({}, {}, new Frame()).then((result) => {
            result.should.eql({});
        });
    });

    describe('config.disposition', function () {
        it('json', function () {
            return shared.headers.get({}, {disposition: {type: 'json', value: 'value'}}, new Frame())
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename="value"',
                        'Content-Type': 'application/json',
                        'Content-Length': 2
                    });
                });
        });

        it('csv', function () {
            return shared.headers.get({}, {disposition: {type: 'csv', value: 'my.csv'}}, new Frame())
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename="my.csv"',
                        'Content-Type': 'text/csv'
                    });
                });
        });

        it('csv with function', async function () {
            const result = await shared.headers.get({}, {
                disposition: {
                    type: 'csv',
                    value() {
                        // pretend we're doing some dynamic filename logic in this function
                        const filename = `awesome-data-2022-08-01.csv`;
                        return filename;
                    }
                }
            }, new Frame());
            result.should.eql({
                'Content-Disposition': 'Attachment; filename="awesome-data-2022-08-01.csv"',
                'Content-Type': 'text/csv'
            });
        });

        it('file', async function () {
            const result = await shared.headers.get({}, {disposition: {type: 'file', value: 'my.txt'}}, new Frame());
            result.should.eql({
                'Content-Disposition': 'Attachment; filename="my.txt"'
            });
        });

        it('file with function', async function () {
            const result = await shared.headers.get({}, {
                disposition: {
                    type: 'file',
                    value() {
                        // pretend we're doing some dynamic filename logic in this function
                        const filename = `awesome-data-2022-08-01.txt`;
                        return filename;
                    }
                }
            }, new Frame());
            result.should.eql({
                'Content-Disposition': 'Attachment; filename="awesome-data-2022-08-01.txt"'
            });
        });

        it('yaml', function () {
            return shared.headers.get('yaml file', {disposition: {type: 'yaml', value: 'my.yaml'}}, new Frame())
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename="my.yaml"',
                        'Content-Type': 'application/yaml',
                        'Content-Length': 11
                    });
                });
        });
    });

    describe('config.cacheInvalidate', function () {
        it('default', function () {
            return shared.headers.get({}, {cacheInvalidate: true}, new Frame())
                .then((result) => {
                    result.should.eql({
                        'X-Cache-Invalidate': '/*'
                    });
                });
        });

        it('custom value', function () {
            return shared.headers.get({}, {cacheInvalidate: {value: 'value'}}, new Frame())
                .then((result) => {
                    result.should.eql({
                        'X-Cache-Invalidate': 'value'
                    });
                });
        });
    });

    describe('location header', function () {
        it('adds header when all needed data is present and method is add', function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const apiConfigHeaders = {};
            const frame = new Frame();
            frame.docName = 'posts',
            frame.method = 'add',
            frame.original = {
                url: {
                    host: 'example.com',
                    pathname: `/api/content/posts/`
                }
            };

            return shared.headers.get(apiResult, apiConfigHeaders, frame)
                .then((result) => {
                    result.should.eql({
                        // NOTE: the backslash in the end is important to avoid unecessary 301s using the header
                        Location: 'https://example.com/api/content/posts/id_value/'
                    });
                });
        });

        it('adds header when a location resolver is provided', function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const resolvedLocationUrl = 'resolved location';

            const apiConfigHeaders = {
                location: {
                    resolve() {
                        return resolvedLocationUrl;
                    }
                }
            };
            const frame = new Frame();
            frame.docName = 'posts';
            frame.method = 'copy';
            frame.original = {
                url: {
                    host: 'example.com',
                    pathname: `/api/content/posts/existing_post_id_value/copy`
                }
            };

            return shared.headers.get(apiResult, apiConfigHeaders, frame)
                .then((result) => {
                    result.should.eql({
                        Location: resolvedLocationUrl
                    });
                });
        });

        it('respects HTTP redirects', async function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const apiConfigHeaders = {};
            const frame = new Frame();

            frame.docName = 'posts';
            frame.method = 'add';
            frame.original = {
                url: {
                    host: 'example.com',
                    pathname: `/api/content/posts/`,
                    secure: false
                }
            };

            const result = await shared.headers.get(apiResult, apiConfigHeaders, frame);
            result.should.eql({
                // NOTE: the backslash in the end is important to avoid unecessary 301s using the header
                Location: 'http://example.com/api/content/posts/id_value/'
            });
        });

        it('adds and resolves header to correct url when pathname does not contain backslash in the end', function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const apiConfigHeaders = {};
            const frame = new Frame();
            frame.docName = 'posts';
            frame.method = 'add';
            frame.original = {
                url: {
                    host: 'example.com',
                    pathname: `/api/content/posts`
                }
            };

            return shared.headers.get(apiResult, apiConfigHeaders, frame)
                .then((result) => {
                    result.should.eql({
                        // NOTE: the backslash in the end is important to avoid unecessary 301s using the header
                        Location: 'https://example.com/api/content/posts/id_value/'
                    });
                });
        });

        it('does not add header when missing result values', function () {
            const apiResult = {};

            const apiConfigHeaders = {};
            const frame = new Frame();
            frame.docName = 'posts';
            frame.method = 'add';
            frame.original = {
                url: {
                    host: 'example.com',
                    pathname: `/api/content/posts/`
                }
            };

            return shared.headers.get(apiResult, apiConfigHeaders, frame)
                .then((result) => {
                    result.should.eql({});
                });
        });
    });
});
