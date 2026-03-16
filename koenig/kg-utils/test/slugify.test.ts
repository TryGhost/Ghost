// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const slugify = require('../lib/slugify');

describe('slugify()', function () {
    it('handles non-string input', function () {
        slugify(null, 'null input').should.eql('');
        slugify(undefined, 'undefined input').should.eql('');
        slugify({}, '{} input').should.eql('');
    });

    describe('<4.x markdown', function () {
        it('replaces all whitespace with empty string', function () {
            slugify('test one\ttwo', {ghostVersion: '2.0', type: 'markdown'})
                .should.eql('testonetwo');
        });

        it('replaces all "non-word" chars with empty string', function () {
            slugify('tést øne twö', {ghostVersion: '2.0', type: 'markdown'})
                .should.eql('tstnetw');
        });

        it('lower cases everything', function () {
            slugify('TÉST ÓNE TWÖ', {ghostVersion: '2.0', type: 'markdown'})
                .should.eql('tstnetw');
        });
    });

    describe('<4.x mobiledoc', function () {
        it('replaces all white space with "-"', function () {
            slugify('test one\ttwo', {ghostVersion: '3.0'})
                .should.eql('test-one-two');
        });

        it('replaces all "non-word" chars with "-"', function () {
            slugify('tést øne twö', {ghostVersion: '3.0'})
                .should.eql('t-st-ne-tw-');
        });

        it('collapses multiple "-"', function () {
            slugify('ñéïñ', {ghostVersion: '3.0'})
                .should.equal('-');
        });

        it('lower cases everything', function () {
            slugify('TEST ONE\tTWO', {ghostVersion: '3.0'})
                .should.eql('test-one-two');
        });
    });

    describe('4.x', function () {
        it('replaces all white space with "-"', function () {
            slugify('test one\t two')
                .should.equal('test-one-two');
        });

        it('strips symbols', function () {
            slugify('test! one? {two}')
                .should.equal('test-one-two');
        });

        it('%-encodes chars', function () {
            const slug = slugify('ñéïñ');

            slug.should.equal('%C3%B1%C3%A9%C3%AF%C3%B1');
            decodeURIComponent(slug).should.equal('ñéïñ');
        });

        it('removes leading/trailing "-" and collapses "-" groups', function () {
            slugify(' \ttest    one  two! \t')
                .should.equal('test-one-two');
        });
    });
});
