import assert from 'node:assert/strict';
import {DEFAULT_SPACER_IMAGE_URL_TEMPLATE, getSpacerImageSrc} from '../../src/utils/spacer-image-src.js';

describe('utils/spacer-image-src', function () {
    it('uses the default spacer image URL template', function () {
        assert.equal(getSpacerImageSrc({width: 200, height: 100}), 'https://img.spacergif.org/v1/200x100/0a/spacer.png');
    });

    it('uses the explicitly configured default', function () {
        const result = getSpacerImageSrc({
            width: 640,
            height: 360,
            options: {imageOptimization: {spacerImage: {urlTemplate: DEFAULT_SPACER_IMAGE_URL_TEMPLATE}}}
        });

        assert.equal(result, 'https://img.spacergif.org/v1/640x360/0a/spacer.png');
    });

    for (const urlTemplate of ['', null, false, 'https://example.com/{width}x{height}.png']) {
        it(`disables spacer images for ${String(urlTemplate)}`, function () {
            const result = getSpacerImageSrc({
                width: 200,
                height: 100,
                options: {imageOptimization: {spacerImage: {urlTemplate}}}
            });

            assert.equal(result, null);
        });
    }

    it('returns null when dimensions are missing', function () {
        assert.equal(getSpacerImageSrc({width: 200, height: null}), null);
    });
});
