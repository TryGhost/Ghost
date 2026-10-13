import assert from 'node:assert/strict';
import {assertPrettifiedIncludes} from './assert-prettified-includes.js';
import {assertPrettifiesTo} from './assert-prettifies-to.js';

describe('HTML renderer assertions', function () {
    it('ignores layout whitespace around inline markup', async function () {
        await assertPrettifiesTo('<p>Hello <strong>world</strong>.</p>', `
            <p>
                Hello
                <strong>world</strong>.
            </p>
        `);
    });

    it('still rejects different content and attributes', async function () {
        await assert.rejects(() => assertPrettifiesTo('<p>Hello</p>', '<p>Goodbye</p>'), assert.AssertionError);
        await assert.rejects(() => assertPrettifiesTo('<a href="/one">Link</a>', '<a href="/two">Link</a>'), assert.AssertionError);
    });

    it('preserves significant whitespace in preformatted content', async function () {
        await assert.rejects(() => assertPrettifiesTo('<pre>  first\nsecond</pre>', '<pre>first\nsecond</pre>'), assert.AssertionError);
    });

    it('normalizes CSS formatting without ignoring different styles', async function () {
        await assertPrettifiedIncludes('<div><p style="color: red; margin: 0px;">Hello</p></div>', '<p style="color:red;margin:0">Hello</p>');
        await assert.rejects(() => assertPrettifiedIncludes('<div><p style="color:red">Hello</p></div>', '<p style="color:blue">Hello</p>'), assert.AssertionError);
    });
});
