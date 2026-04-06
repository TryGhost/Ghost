const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const urlUtilsHelper = require('../../utils/url-utils');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

describe('Snippet Model', function () {
    const siteUrl = configUtils.config.get('url');

    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    before(testUtils.setup('users:roles', 'snippets'));

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('/test-url/');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('URL transformations without CDN config', function () {
        describe('Mobiledoc', function () {
            let snippet, mobiledoc;

            before(async function () {
                const snippets = await models.Snippet.findAll();
                snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                assertExists(snippet, 'Mobiledoc snippet should exist');
                mobiledoc = JSON.parse(snippet.get('mobiledoc'));
            });

            it('transforms image card src to absolute site URL', function () {
                const imageCard = mobiledoc.cards.find(card => card[0] === 'image');

                assert.equal(imageCard[1].src, `${siteUrl}/content/images/snippet-inline.jpg`);
            });

            it('transforms file card src to absolute site URL', function () {
                const fileCard = mobiledoc.cards.find(card => card[0] === 'file');

                assert.equal(fileCard[1].src, `${siteUrl}/content/files/snippet-document.pdf`);
            });

            it('transforms video card src and thumbnailSrc to absolute site URLs', function () {
                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');

                assert.equal(videoCard[1].src, `${siteUrl}/content/media/snippet-video.mp4`);
                assert.equal(videoCard[1].thumbnailSrc, `${siteUrl}/content/images/snippet-video-thumb.jpg`);
            });

            it('transforms audio card src and thumbnailSrc to absolute site URLs', function () {
                const audioCard = mobiledoc.cards.find(card => card[0] === 'audio');

                assert.equal(audioCard[1].src, `${siteUrl}/content/media/snippet-audio.mp3`);
                assert.equal(audioCard[1].thumbnailSrc, `${siteUrl}/content/images/snippet-audio-thumb.jpg`);
            });

            it('transforms link markup href to absolute site URL', function () {
                const linkMarkup = mobiledoc.markups.find(markup => markup[0] === 'a');

                assert.equal(linkMarkup[1][1], `${siteUrl}/snippet-link`);
            });
        });

        describe('Lexical', function () {
            let snippet, lexicalString;

            before(async function () {
                const snippets = await models.Snippet.findAll();
                snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                assertExists(snippet, 'Lexical snippet should exist');
                lexicalString = snippet.get('lexical');
            });

            it('transforms all media URLs to absolute site URLs', function () {
                assert(lexicalString.includes(`${siteUrl}/content/images/snippet-inline.jpg`));
                assert(lexicalString.includes(`${siteUrl}/content/files/snippet-document.pdf`));
                assert(lexicalString.includes(`${siteUrl}/content/media/snippet-video.mp4`));
                assert(lexicalString.includes(`${siteUrl}/content/images/snippet-video-thumb.jpg`));
                assert(lexicalString.includes(`${siteUrl}/content/media/snippet-audio.mp3`));
                assert(lexicalString.includes(`${siteUrl}/content/images/snippet-audio-thumb.jpg`));
                assert(lexicalString.includes(`${siteUrl}/snippet-link`));

                // Verify no __GHOST_URL__ placeholders remain
                assert(!lexicalString.includes('__GHOST_URL__'));
            });
        });
    });

    describe('URL transformations with CDN config', function () {
        const cdnUrl = 'https://cdn.example.com/c/site-uuid';

        beforeEach(function () {
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {
                    media: cdnUrl,
                    files: cdnUrl,
                    image: cdnUrl
                }
            }, sinon);
        });

        describe('Mobiledoc', function () {
            it('transforms file card src to files CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const fileCard = mobiledoc.cards.find(card => card[0] === 'file');
                assert.equal(fileCard[1].src, `${cdnUrl}/content/files/snippet-document.pdf`);
            });

            it('transforms video card src to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');
                assert.equal(videoCard[1].src, `${cdnUrl}/content/media/snippet-video.mp4`);
            });

            it('transforms audio card src to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const audioCard = mobiledoc.cards.find(card => card[0] === 'audio');
                assert.equal(audioCard[1].src, `${cdnUrl}/content/media/snippet-audio.mp3`);
            });

            it('transforms image card src to CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const imageCard = mobiledoc.cards.find(card => card[0] === 'image');
                assert.equal(imageCard[1].src, `${cdnUrl}/content/images/snippet-inline.jpg`);
            });

            it('transforms video thumbnailSrc to CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');
                assert.equal(videoCard[1].thumbnailSrc, `${cdnUrl}/content/images/snippet-video-thumb.jpg`);
            });
        });

        describe('Lexical', function () {
            it('transforms file URLs to files CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                assert(lexicalString.includes(`${cdnUrl}/content/files/snippet-document.pdf`));
            });

            it('transforms video/audio URLs to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                assert(lexicalString.includes(`${cdnUrl}/content/media/snippet-video.mp4`));
                assert(lexicalString.includes(`${cdnUrl}/content/media/snippet-audio.mp3`));
            });

            it('transforms image URLs to CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                assert(lexicalString.includes(`${cdnUrl}/content/images/snippet-inline.jpg`));
                assert(lexicalString.includes(`${cdnUrl}/content/images/snippet-video-thumb.jpg`));
                assert(lexicalString.includes(`${cdnUrl}/content/images/snippet-audio-thumb.jpg`));
            });
        });
    });
});
