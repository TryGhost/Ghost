import {describe, expect, test} from 'vitest';
import {sanitizeHtml} from '../../../src/utils/sanitize-html';

describe('Utils: sanitize-html', async () => {
    test('can replace scripts', async function () {
        const sanitizedHtml = sanitizeHtml('<span>Hey</span><script>alert("hello");</script>');
        expect(sanitizedHtml).toEqual('<span>Hey</span><pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });

    it('can render html', async function () {
        const sanitizedHtml = sanitizeHtml('<strong>bold</strong>');
        expect(sanitizedHtml).toEqual('<strong>bold</strong>');
    });
});
