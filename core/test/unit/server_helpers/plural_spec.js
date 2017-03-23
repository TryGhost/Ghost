var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{plural}} helper', function () {
    it('will show no-value string', function () {
        var expected = 'No Posts',
            rendered = helpers.plural.call({}, 0, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('will show no-value string with placement', function () {
        var expected = '0 Posts',
            rendered = helpers.plural.call({}, 0, {
                hash: {
                    empty: '% Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('will show singular string', function () {
        var expected = '1 Post',
            rendered = helpers.plural.call({}, 1, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });

    it('will show plural string', function () {
        var expected = '2 Posts',
            rendered = helpers.plural.call({}, 2, {
                hash: {
                    empty: 'No Posts',
                    singular: '% Post',
                    plural: '% Posts'
                }
            });

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
