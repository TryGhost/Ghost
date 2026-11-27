import assert from 'node:assert/strict';
import {escapeHtml} from '../../src/utils/escape-html.js';

describe('utils/escape-html', function () {
    it('escapes unsafe html characters', function () {
        const escaped = escapeHtml('<script>alert("x")</script> & data');

        assert.equal(escaped, '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; data');
    });

    it('does not double-escape pre-encoded entities', function () {
        const escaped = escapeHtml('Q&amp;A &quot;session&quot;');

        assert.equal(escaped, 'Q&amp;A &quot;session&quot;');
    });

    it('keeps a query string whose parameters look like legacy entities', function () {
        assert.equal(
            escapeHtml('https://x.example/?w=1&region=us&param=2&copy=1'),
            'https://x.example/?w=1&amp;region=us&amp;param=2&amp;copy=1'
        );
    });

    it('writes a value that is not a string as text', function () {
        assert.equal(escapeHtml(5 as unknown as string), '5');
        assert.equal(escapeHtml(true as unknown as string), 'true');
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
    });
});
