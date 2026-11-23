import assert from 'node:assert/strict';
import {sanitizeColor} from '../../src/utils/sanitize-color.js';

describe('utils/sanitize-color', function () {
    it('keeps the formats card settings hold', function () {
        for (const color of ['#fff', '#FF1A75', '#ff1a7580', 'accent', 'transparent', 'grey', 'rgb(0, 0, 0)', 'rgba(0,0,0,0.5)', 'hsl(0 0% 0% / 50%)', 'hsl(-120, 100%, 50%)', 'hsl(120deg, 100%, 50%)', 'hsl(0.5turn 50% 50%)', 'hwb(194 0% 0%)', 'oklch(60% 0.15 50)', 'color(display-p3 1 0 0)']) {
            assert.equal(sanitizeColor(color), color);
        }
    });

    it('trims surrounding whitespace', function () {
        assert.equal(sanitizeColor(' #fff '), '#fff');
    });

    it('returns the fallback for a color that isn\'t in a supported format', function () {
        for (const badColor of ['red; width: 100%', '#fff" x="', 'red>', 'rgb(0, 0, 0); width: 100%', 'url(x)', 'rgb(var(--x))', '', undefined, null, 1]) {
            assert.equal(sanitizeColor(badColor, '#000000'), '#000000', String(badColor));
        }
    });

    it('falls back to an empty string by default', function () {
        assert.equal(sanitizeColor('red;'), '');
    });
});
