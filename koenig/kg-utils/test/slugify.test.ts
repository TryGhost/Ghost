import slugify from '../src/slugify.js';

describe('slugify()', function () {
    it('handles non-string input', function () {
        expect(slugify(null)).toEqual('');
        expect(slugify(undefined)).toEqual('');
        expect(slugify({})).toEqual('');
    });

    describe('<4.x markdown', function () {
        it('replaces all whitespace with empty string', function () {
            expect(slugify('test one\ttwo', {ghostVersion: '2.0', type: 'markdown'}))
                .toEqual('testonetwo');
        });

        it('replaces all "non-word" chars with empty string', function () {
            expect(slugify('tést øne twö', {ghostVersion: '2.0', type: 'markdown'}))
                .toEqual('tstnetw');
        });

        it('lower cases everything', function () {
            expect(slugify('TÉST ÓNE TWÖ', {ghostVersion: '2.0', type: 'markdown'}))
                .toEqual('tstnetw');
        });
    });

    describe('<4.x mobiledoc', function () {
        it('replaces all white space with "-"', function () {
            expect(slugify('test one\ttwo', {ghostVersion: '3.0'}))
                .toEqual('test-one-two');
        });

        it('replaces all "non-word" chars with "-"', function () {
            expect(slugify('tést øne twö', {ghostVersion: '3.0'}))
                .toEqual('t-st-ne-tw-');
        });

        it('collapses multiple "-"', function () {
            expect(slugify('ñéïñ', {ghostVersion: '3.0'}))
                .toBe('-');
        });

        it('lower cases everything', function () {
            expect(slugify('TEST ONE\tTWO', {ghostVersion: '3.0'}))
                .toEqual('test-one-two');
        });
    });

    describe('4.x', function () {
        it('replaces all white space with "-"', function () {
            expect(slugify('test one\t two'))
                .toBe('test-one-two');
        });

        it('strips symbols', function () {
            expect(slugify('test! one? {two}'))
                .toBe('test-one-two');
        });

        it('%-encodes chars', function () {
            const slug = slugify('ñéïñ');

            expect(slug).toBe('%C3%B1%C3%A9%C3%AF%C3%B1');
            expect(decodeURIComponent(slug)).toBe('ñéïñ');
        });

        it('removes leading/trailing "-" and collapses "-" groups', function () {
            expect(slugify(' \ttest    one  two! \t'))
                .toBe('test-one-two');
        });
    });
});
