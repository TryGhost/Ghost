const should = require('should');
const shared = require('../../../../server/api/shared');

describe('Unit: api/shared/headers', function () {
    it('empty headers config', function () {
        shared.headers.get().should.eql({});
    });

    describe('config.disposition', function () {
        it('json', function () {
            shared.headers.get({}, {disposition: {type: 'json', value: 'value'}}).should.eql({
                'Content-Disposition': 'value',
                'Content-Type': 'application/json',
                'Content-Length': 2
            });
        });

        it('csv', function () {
            shared.headers.get({}, {disposition: {type: 'csv', value: 'my.csv'}}).should.eql({
                'Content-Disposition': 'my.csv',
                'Content-Type': 'text/csv'
            });
        });

        it('yaml', function () {
            shared.headers.get('yaml file', {disposition: {type: 'yaml', value: 'my.yaml'}}).should.eql({
                'Content-Disposition': 'my.yaml',
                'Content-Type': 'application/yaml',
                'Content-Length': 11
            });
        });
    });

    describe('config.cacheInvalidate', function () {
        it('default', function () {
            shared.headers.get({}, {cacheInvalidate: true}).should.eql({
                'X-Cache-Invalidate': '/*'
            });
        });

        it('custom value', function () {
            shared.headers.get({}, {cacheInvalidate: {value: 'value'}}).should.eql({
                'X-Cache-Invalidate': 'value'
            });
        });
    });
});
