import assert from 'node:assert/strict';
import {assertPrettifiedIncludes} from './assert-prettified-includes.js';
import {assertPrettifiesTo} from './assert-prettifies-to.js';

describe('HTML renderer assertions', function () {
    it('ignores layout whitespace around inline markup', function () {
        assertPrettifiesTo('<p>Hello <strong>world</strong>.</p>', `
            <p>
                Hello
                <strong>world</strong>.
            </p>
        `);
    });

    it('still rejects different content and attributes', function () {
        assert.throws(() => assertPrettifiesTo('<p>Hello</p>', '<p>Goodbye</p>'), assert.AssertionError);
        assert.throws(() => assertPrettifiesTo('<a href="/one">Link</a>', '<a href="/two">Link</a>'), assert.AssertionError);
    });

    it('preserves significant whitespace in preformatted content', function () {
        assert.throws(() => assertPrettifiesTo('<pre>  first\nsecond</pre>', '<pre>first\nsecond</pre>'), assert.AssertionError);
    });

    it('normalizes CSS formatting without ignoring different styles', function () {
        assertPrettifiedIncludes('<div><p style="color: red; margin: 0px;">Hello</p></div>', '<p style="color:red;margin:0">Hello</p>');
        assert.throws(() => assertPrettifiedIncludes('<div><p style="color:red">Hello</p></div>', '<p style="color:blue">Hello</p>'), assert.AssertionError);
    });
});
