const assert = require('node:assert/strict');
const {escapeHtml} = require('../../../../../../core/server/services/koenig/render-utils/escape-html');

describe('services/koenig/render-utils/escape-html', function () {
    it('escapes unsafe html characters', function () {
        const escaped = escapeHtml('<script>alert("x")</script> & data');

        assert.equal(escaped, '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; data');
    });

    it('does not double-escape pre-encoded entities', function () {
        const escaped = escapeHtml('Q&amp;A &quot;session&quot;');

        assert.equal(escaped, 'Q&amp;A &quot;session&quot;');
    });
});
