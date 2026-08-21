import assert from 'node:assert/strict';
import { escapeInlineJson } from '../../../../core/frontend/utils/escape-inline-json';

describe('escapeInlineJson', function () {
  it('neutralises a </script> breakout without losing the data', function () {
    const payload = 'foo</script><script>alert(document.domain)</script>';
    const escaped = escapeInlineJson(JSON.stringify({ name: payload }));

    // No literal </script> can survive to close the inline JSON-LD element.
    assert.ok(!escaped.includes('</script>'), 'must not contain a literal </script>');
    assert.ok(escaped.includes('\\u003c/script\\u003e'), 'the < must be JSON-unicode-escaped');

    // ...but a JSON-LD consumer (Google et al.) decodes it back to the original.
    assert.equal(JSON.parse(escaped).name, payload);
  });

  it('escapes <!-- comment breakout as well', function () {
    const escaped = escapeInlineJson(JSON.stringify({ name: '<!--' }));

    assert.ok(!escaped.includes('<!--'));
    assert.equal(JSON.parse(escaped).name, '<!--');
  });

  it('escapes the JS line terminators that are legal in JSON', function () {
    // The announcement bar's payload is read by the JS parser, not JSON.parse,
    // and U+2028/U+2029 are valid in a JSON string but end a line in JavaScript
    // source, so unescaped they would be a syntax error.
    const value = 'before\u2028after\u2029end';
    const escaped = escapeInlineJson(JSON.stringify({ value }));

    assert.ok(!escaped.includes('\u2028'), 'U+2028 must be escaped');
    assert.ok(!escaped.includes('\u2029'), 'U+2029 must be escaped');
    assert.equal(JSON.parse(escaped).value, value);
  });

  it('leaves SEO-significant characters intact (no HTML-entity corruption)', function () {
    // These characters are safe inside <script> raw text and must round-trip
    // verbatim — HTML-entity escaping them (&amp;, &#x27;, &quot;) would be
    // indexed literally by structured-data parsers, which never HTML-decode.
    const value = 'Tom & Jerry\'s "Q&A" > answers';
    const escaped = escapeInlineJson(JSON.stringify({ keywords: value }));

    assert.ok(!escaped.includes('&amp;'), 'ampersand must not be HTML-escaped');
    assert.ok(!escaped.includes('&#x27;'), 'apostrophe must not be HTML-escaped');
    assert.ok(!escaped.includes('&quot;'), 'quote must not be HTML-escaped');
    assert.equal(JSON.parse(escaped).keywords, value);
  });
});
