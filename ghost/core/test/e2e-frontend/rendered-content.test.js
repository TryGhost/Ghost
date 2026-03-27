const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');

const testUtils = require('../utils');
const config = require('../../core/shared/config');
const configUtils = require('../utils/config-utils');
const urlUtilsHelper = require('../utils/url-utils');

describe('Post Rendering', function () {
    let siteUrl;
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        siteUrl = config.get('url');

        await testUtils.teardownDb();
        await testUtils.initData();
        await testUtils.initFixtures('posts');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('HTML', function () {
        it('Mobiledoc post renders with all URLs as absolute site URLs', async function () {
            await request.get('/post-with-all-media-types-mobiledoc/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    assert(res.text.includes(`${siteUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/audio.mp3`));
                    assert(res.text.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-audio.mp3`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });

        it('Lexical post renders with all URLs as absolute site URLs', async function () {
            await request.get('/post-with-all-media-types-lexical/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    assert(res.text.includes(`${siteUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/audio.mp3`));
                    assert(res.text.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-audio.mp3`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });

        it('Mobiledoc post renders with CDN URLs when image CDN is configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, image: cdnUrl, files: cdnUrl}
            }, sinon);

            await request.get('/post-with-all-media-types-mobiledoc/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    // All assets use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/audio.mp3`));
                    // Video/audio thumbnails use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/video-thumb.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/audio-thumb.jpg`));
                    // Gallery images use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/gallery-1.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/gallery-2.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/gallery-3.jpg`));
                    // Snippet images use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-audio.mp3`));
                    assert(res.text.includes(`${cdnUrl}/content/images/snippet-video-thumb.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/snippet-audio-thumb.jpg`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });

        it('Lexical post renders with CDN URLs when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
            }, sinon);

            await request.get('/post-with-all-media-types-lexical/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    // All assets use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/audio.mp3`));
                    // Video/audio thumbnails use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/video-thumb.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/audio-thumb.jpg`));
                    // Gallery images use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/gallery-1.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/gallery-2.jpg`));
                    // Snippet images use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-audio.mp3`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });

        it('Lexical post renders CDN images with srcset when urls:image is configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            configUtils.set('urls:image', cdnUrl);
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
            }, sinon);

            await request.get('/post-with-all-media-types-lexical/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    // CDN images should get srcset attributes with /size/w{width}/ pattern
                    assert(res.text.includes(`${cdnUrl}/content/images/size/w`), 'CDN images should have srcset with /size/w pattern');
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });
    });

    describe('RSS', function () {
        it('RSS feed renders with all URLs as absolute site URLs', async function () {
            await request.get('/rss/')
                .expect(200)
                .expect('Content-Type', 'application/rss+xml; charset=utf-8')
                .expect((res) => {
                    assert(res.text.includes(`${siteUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/audio.mp3`));
                    assert(res.text.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${siteUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${siteUrl}/content/media/snippet-audio.mp3`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });

        it('RSS feed renders with CDN URLs when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl, image: cdnUrl}
            }, sinon);

            await request.get('/rss/')
                .expect(200)
                .expect('Content-Type', 'application/rss+xml; charset=utf-8')
                .expect((res) => {
                    // All assets use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/feature.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/images/inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/audio.mp3`));
                    // Snippet images use CDN URL
                    assert(res.text.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                    assert(res.text.includes(`${cdnUrl}/content/files/snippet-document.pdf`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-video.mp4`));
                    assert(res.text.includes(`${cdnUrl}/content/media/snippet-audio.mp3`));
                    assert(!res.text.includes('__GHOST_URL__'));
                });
        });
    });
});
