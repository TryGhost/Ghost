const assert = require('node:assert/strict');

const {DEFAULT_SPACER_IMAGE_URL_TEMPLATE, getSpacerImageSrc} = require('../../../../../../core/server/services/koenig/render-utils/spacer-image-src');

describe('services/koenig/render-utils/spacer-image-src', function () {
    it('uses the default spacer image URL template', function () {
        const result = getSpacerImageSrc({width: 200, height: 100});

        assert.equal(result, 'https://img.spacergif.org/v1/200x100/0a/spacer.png');
    });

    it('uses the explicitly configured default spacer image URL template', function () {
        const result = getSpacerImageSrc({
            width: 640,
            height: 360,
            options: {
                spacerImage: {
                    urlTemplate: DEFAULT_SPACER_IMAGE_URL_TEMPLATE
                }
            }
        });

        assert.equal(result, 'https://img.spacergif.org/v1/640x360/0a/spacer.png');
    });

    it('supports the default spacer image setting passed through imageOptimization', function () {
        const result = getSpacerImageSrc({
            width: 150,
            height: 300,
            options: {
                imageOptimization: {
                    spacerImage: {
                        urlTemplate: DEFAULT_SPACER_IMAGE_URL_TEMPLATE
                    }
                }
            }
        });

        assert.equal(result, 'https://img.spacergif.org/v1/150x300/0a/spacer.png');
    });

    it('disables spacer images when a custom URL template is supplied', function () {
        const result = getSpacerImageSrc({
            width: 300,
            height: 250,
            options: {
                spacerImage: {
                    urlTemplate: 'https://images.example.com/spacer/{width}/{height}.png'
                }
            }
        });

        assert.equal(result, null);
    });

    it('returns null when spacer image URL output is disabled', function () {
        const result = getSpacerImageSrc({
            width: 200,
            height: 100,
            options: {
                spacerImage: {
                    urlTemplate: ''
                }
            }
        });

        assert.equal(result, null);
    });

    it('returns null when spacer image URL output is explicitly disabled with null', function () {
        const result = getSpacerImageSrc({
            width: 200,
            height: 100,
            options: {
                spacerImage: {
                    urlTemplate: null
                }
            }
        });

        assert.equal(result, null);
    });

    it('returns null when spacer image URL output is explicitly disabled with false', function () {
        const result = getSpacerImageSrc({
            width: 200,
            height: 100,
            options: {
                spacerImage: {
                    urlTemplate: false
                }
            }
        });

        assert.equal(result, null);
    });

    it('returns null when dimensions are missing', function () {
        const result = getSpacerImageSrc({
            width: 200,
            options: {
                spacerImage: {
                    urlTemplate: DEFAULT_SPACER_IMAGE_URL_TEMPLATE
                }
            }
        });

        assert.equal(result, null);
    });
});
