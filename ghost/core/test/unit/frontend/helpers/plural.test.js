const should = require('should');

// Stuff we are testing
const plural = require('../../../../core/frontend/helpers/plural');

describe('{{plural}} helper', function () {
    it('will show no-value string', function () {
        const expected = 'No Posts';

        const rendered = plural.call({}, 0, {
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
        const expected = '0 Posts';

        const rendered = plural.call({}, 0, {
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
        const expected = '1 Post';

        const rendered = plural.call({}, 1, {
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
        const expected = '2 Posts';

        const rendered = plural.call({}, 2, {
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
