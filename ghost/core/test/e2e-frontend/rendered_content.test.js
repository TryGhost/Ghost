const sinon = require('sinon');
const supertest = require('supertest');

const testUtils = require('../utils');
const config = require('../../core/shared/config');
const urlUtilsHelper = require('../utils/urlUtils');

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

    afterEach(function () {
        sinon.restore();
    });

    describe('HTML', function () {
        it('Mobiledoc post renders with all URLs as absolute site URLs', async function () {
            await request.get('/post-with-all-media-types-mobiledoc/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('Lexical post renders with all URLs as absolute site URLs', async function () {
            await request.get('/post-with-all-media-types-lexical/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('Mobiledoc post renders with CDN URLs for media/files when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl}
            }, sinon);

            await request.get('/post-with-all-media-types-mobiledoc/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql(`${cdnUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${cdnUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('Lexical post renders with CDN URLs for media/files when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl}
            }, sinon);

            await request.get('/post-with-all-media-types-lexical/')
                .expect('Content-Type', /html/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql(`${cdnUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${cdnUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });
    });

    describe('RSS', function () {
        it('RSS feed renders with all URLs as absolute site URLs', async function () {
            await request.get('/rss/')
                .expect(200)
                .expect('Content-Type', 'application/rss+xml; charset=utf-8')
                .expect((res) => {
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${siteUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('RSS feed renders with CDN URLs for media/files when configured', async function () {
            const cdnUrl = 'https://cdn.example.com/c/site-uuid';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, files: cdnUrl}
            }, sinon);

            await request.get('/rss/')
                .expect(200)
                .expect('Content-Type', 'application/rss+xml; charset=utf-8')
                .expect((res) => {
                    res.text.should.containEql(`${cdnUrl}/content/files/document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/audio.mp3`);
                    res.text.should.containEql(`${cdnUrl}/content/files/snippet-document.pdf`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-video.mp4`);
                    res.text.should.containEql(`${cdnUrl}/content/media/snippet-audio.mp3`);
                    res.text.should.containEql(`${siteUrl}/content/images/feature.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/inline.jpg`);
                    res.text.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });
    });
});
