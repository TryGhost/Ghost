const should = require('should');
const shared = require('../../../../core/server/api/shared');

describe('Unit: api/shared/headers', function () {
    it('empty headers config', function () {
        return shared.headers.get().then((result) => {
            result.should.eql({});
        });
    });

    describe('config.disposition', function () {
        it('json', function () {
            return shared.headers.get({}, {disposition: {type: 'json', value: 'value'}})
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename=\"value\"',
                        'Content-Type': 'application/json',
                        'Content-Length': 2
                    });
                });
        });

        it('csv', function () {
            return shared.headers.get({}, {disposition: {type: 'csv', value: 'my.csv'}})
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename=\"my.csv\"',
                        'Content-Type': 'text/csv'
                    });
                });
        });

        it('yaml', function () {
            return shared.headers.get('yaml file', {disposition: {type: 'yaml', value: 'my.yaml'}})
                .then((result) => {
                    result.should.eql({
                        'Content-Disposition': 'Attachment; filename=\"my.yaml\"',
                        'Content-Type': 'application/yaml',
                        'Content-Length': 11
                    });
                });
        });
    });

    describe('config.cacheInvalidate', function () {
        it('default', function () {
            return shared.headers.get({}, {cacheInvalidate: true})
                .then((result) => {
                    result.should.eql({
                        'X-Cache-Invalidate': '/*'
                    });
                });
        });

        it('custom value', function () {
            return shared.headers.get({}, {cacheInvalidate: {value: 'value'}})
                .then((result) => {
                    result.should.eql({
                        'X-Cache-Invalidate': 'value'
                    });
                });
        });
    });

    describe('location header', function () {
        it('adds header when all needed data is present', function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const apiConfigHeaders = {};
            const frame = {
                docName: 'posts',
                method: 'add',
                original: {
                    url: {
                        host: 'example.com',
                        pathname: `/api/content/posts/`
                    }
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

        it('adds and resolves header to correct url when pathname does not contain backslash in the end', function () {
            const apiResult = {
                posts: [{
                    id: 'id_value'
                }]
            };

            const apiConfigHeaders = {};
            const frame = {
                docName: 'posts',
                method: 'add',
                original: {
                    url: {
                        host: 'example.com',
                        pathname: `/api/content/posts`
                    }
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
            const frame = {
                docName: 'posts',
                method: 'add',
                original: {
                    url: {
                        host: 'example.com',
                        pathname: `/api/content/posts/`
                    }
                }
            };

            return shared.headers.get(apiResult, apiConfigHeaders, frame)
                .then((result) => {
                    result.should.eql({});
                });
        });
    });
});
