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
});
