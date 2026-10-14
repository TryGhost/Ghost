import assert from 'node:assert/strict';
import {truncateHtml} from '../../src/utils/truncate.js';

describe('utils/truncate', function () {
    describe('truncateHtml', function () {
        it('truncates for mobile and desktop', function () {
            assert.equal(
                truncateHtml('This is a short one', 10, 5),
                'This<span class="desktop-only"> is a</span>…'
            );
            assert.equal(
                truncateHtml('This is abc', 10, 5),
                'This<span class="desktop-only"> is a</span>…'
            );
        });

        it('keeps the full text on desktop when it fits maxLength', function () {
            assert.equal(
                truncateHtml('This is a', 10, 5),
                'This<span class="desktop-only"> is a</span><span class="hide-desktop">…</span>'
            );
            assert.equal(
                truncateHtml('This is ab', 10, 5),
                'This<span class="desktop-only"> is ab</span><span class="hide-desktop">…</span>'
            );
        });

        it('does not truncate text that fits on mobile', function () {
            assert.equal(truncateHtml('This', 10, 5), 'This');
        });
    });
});
