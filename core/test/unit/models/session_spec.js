const should = require('should');
const models = require('../../../server/models');

describe('Unit: models/session', function () {
    before(function () {
        models.init();
    });

    describe('parse', function () {
        const parse = function parse(attrs) {
            return new models.Session().parse(attrs);
        };

        it('converts session_data to an object', function () {
            const attrs = {
                id: 'something',
                session_data: JSON.stringify({
                    some: 'data'
                })
            };
            const parsed = parse(attrs);
            should.equal(typeof parsed.session_data, 'object');
            should.equal(parsed.session_data.some, 'data');
        });

        it('does not add session_data key if missing', function () {
            const attrs = {
                id: 'something'
            };
            const parsed = parse(attrs);
            should.equal(parsed.session_data, undefined);
        });
    });

    describe('format', function () {
        const format = function format(attrs) {
            return new models.Session().format(attrs);
        };

        it('converts session_data to a string', function () {
            const attrs = {
                id: 'something',
                session_data: {
                    some: 'data'
                }
            };
            const formatted = format(attrs);
            should.equal(typeof formatted.session_data, 'string');
            should.equal(formatted.session_data, JSON.stringify({
                some: 'data'
            }));
        });

        it('does not add session_data key if missing', function () {
            const attrs = {
                id: 'something'
            };
            const formatted = format(attrs);
            should.equal(formatted.session_data, undefined);
        });
    });
});
