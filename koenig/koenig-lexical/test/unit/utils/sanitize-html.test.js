import {describe, expect, test} from 'vitest';
import {sanitizeHtml} from '../../../src/utils/sanitize-html';

describe('Utils: sanitize-html', () => {
    test('can replace scripts', function () {
        const sanitizedHtml = sanitizeHtml('<span>Hey</span><script>alert("hello");</script>');
        expect(sanitizedHtml).toEqual('<span>Hey</span><pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });

    it('can render html', function () {
        const sanitizedHtml = sanitizeHtml('<strong>bold</strong>');
        expect(sanitizedHtml).toEqual('<strong>bold</strong>');
    });

    it('strips style elements but keeps style attributes', function () {
        const sanitizedHtml = sanitizeHtml('<span style="color: red;">Hey</span><style>span {color: blue;}</style>');
        expect(sanitizedHtml).toEqual('<span style="color: red;">Hey</span>');
    });
});
