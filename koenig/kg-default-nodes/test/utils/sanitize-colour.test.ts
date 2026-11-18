import assert from 'node:assert/strict';
import {sanitizeColour} from '../../src/utils/sanitize-colour.js';

describe('utils/sanitize-colour', function () {
    it('keeps the formats card settings hold', function () {
        for (const colour of ['#fff', '#FF1A75', '#ff1a7580', 'accent', 'transparent', 'grey', 'rgb(0, 0, 0)', 'rgba(0,0,0,0.5)', 'hsl(0 0% 0% / 50%)']) {
            assert.equal(sanitizeColour(colour), colour);
        }
    });

    it('trims surrounding whitespace', function () {
        assert.equal(sanitizeColour(' #fff '), '#fff');
    });

    it('returns the fallback for a colour that isn\'t in a supported format', function () {
        for (const badColour of ['red; width: 100%', '#fff" x="', 'red>', 'rgb(0, 0, 0); width: 100%', 'url(x)', '', undefined, null, 1]) {
            assert.equal(sanitizeColour(badColour, '#000000'), '#000000', String(badColour));
        }
    });

    it('falls back to an empty string by default', function () {
        assert.equal(sanitizeColour('red;'), '');
    });
});
