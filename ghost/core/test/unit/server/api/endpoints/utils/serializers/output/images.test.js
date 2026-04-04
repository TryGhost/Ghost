const assert = require('node:assert/strict');
const config = require('../../../../../../../../core/shared/config');
const imagesSerializer = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/images');

describe('Images output serializer', function () {
    describe('upload', function () {
        it('converts a local relative path to an absolute URL', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: null}, response: null};
            imagesSerializer.upload('/content/images/2026/03/photo.jpg', {}, frame);

            assert.equal(frame.response.images[0].url, `${siteUrl}/content/images/2026/03/photo.jpg`);
        });

        it('passes through a CDN URL unchanged', function () {
            const cdnUrl = 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/03/photo.jpg';
            const frame = {data: {ref: null}, response: null};
            imagesSerializer.upload(cdnUrl, {}, frame);

            assert.equal(frame.response.images[0].url, cdnUrl);
        });

        it('includes ref from frame data', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: 'img-ref-789'}, response: null};
            imagesSerializer.upload('/content/images/2026/03/photo.jpg', {}, frame);

            assert.equal(frame.response.images[0].url, `${siteUrl}/content/images/2026/03/photo.jpg`);
            assert.equal(frame.response.images[0].ref, 'img-ref-789');
        });
    });
});
