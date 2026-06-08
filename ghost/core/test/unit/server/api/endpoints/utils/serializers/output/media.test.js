const assert = require('node:assert/strict');
const config = require('../../../../../../../../core/shared/config');
const mediaSerializer = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/media');

describe('Media output serializer', function () {
    describe('upload', function () {
        it('converts local relative paths to absolute URLs', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: null}, response: null};
            mediaSerializer.upload({
                filePath: '/content/media/2026/03/video.mp4',
                thumbnailPath: '/content/media/2026/03/video_thumb.png'
            }, {}, frame);

            assert.equal(frame.response.media[0].url, `${siteUrl}/content/media/2026/03/video.mp4`);
            assert.equal(frame.response.media[0].thumbnail_url, `${siteUrl}/content/media/2026/03/video_thumb.png`);
        });

        it('passes through CDN URLs unchanged', function () {
            const cdnMedia = 'https://storage.ghost.is/c/6f/a3/site/content/media/2026/03/video.mp4';
            const cdnThumb = 'https://storage.ghost.is/c/6f/a3/site/content/media/2026/03/video_thumb.png';
            const frame = {data: {ref: null}, response: null};
            mediaSerializer.upload({filePath: cdnMedia, thumbnailPath: cdnThumb}, {}, frame);

            assert.equal(frame.response.media[0].url, cdnMedia);
            assert.equal(frame.response.media[0].thumbnail_url, cdnThumb);
        });

        it('includes ref from frame data', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: 'media-ref-456'}, response: null};
            mediaSerializer.upload({
                filePath: '/content/media/2026/03/video.mp4',
                thumbnailPath: null
            }, {}, frame);

            assert.equal(frame.response.media[0].url, `${siteUrl}/content/media/2026/03/video.mp4`);
            assert.equal(frame.response.media[0].ref, 'media-ref-456');
        });
    });

    describe('uploadThumbnail', function () {
        it('converts a local relative path to an absolute URL', function () {
            const siteUrl = config.getSiteUrl().replace(/\/$/, '');
            const frame = {data: {ref: null}, response: null};
            mediaSerializer.uploadThumbnail('/content/media/2026/03/video_thumb.png', {}, frame);

            assert.equal(frame.response.media[0].url, `${siteUrl}/content/media/2026/03/video_thumb.png`);
        });

        it('passes through a CDN URL unchanged', function () {
            const cdnUrl = 'https://storage.ghost.is/c/6f/a3/site/content/media/2026/03/video_thumb.png';
            const frame = {data: {ref: null}, response: null};
            mediaSerializer.uploadThumbnail(cdnUrl, {}, frame);

            assert.equal(frame.response.media[0].url, cdnUrl);
        });
    });
});
