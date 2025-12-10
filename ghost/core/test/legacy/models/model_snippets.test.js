const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const urlUtilsHelper = require('../../utils/urlUtils');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

describe('Snippet Model', function () {
    const siteUrl = 'http://127.0.0.1:2369';

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
                should.exist(snippet, 'Mobiledoc snippet should exist');
                mobiledoc = JSON.parse(snippet.get('mobiledoc'));
            });

            it('transforms image card src to absolute site URL', function () {
                const imageCard = mobiledoc.cards.find(card => card[0] === 'image');

                imageCard[1].src.should.equal(`${siteUrl}/content/images/snippet-inline.jpg`);
            });

            it('transforms file card src to absolute site URL', function () {
                const fileCard = mobiledoc.cards.find(card => card[0] === 'file');

                fileCard[1].src.should.equal(`${siteUrl}/content/files/snippet-document.pdf`);
            });

            it('transforms video card src and thumbnailSrc to absolute site URLs', function () {
                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');

                videoCard[1].src.should.equal(`${siteUrl}/content/media/snippet-video.mp4`);
                videoCard[1].thumbnailSrc.should.equal(`${siteUrl}/content/images/snippet-video-thumb.jpg`);
            });

            it('transforms audio card src and thumbnailSrc to absolute site URLs', function () {
                const audioCard = mobiledoc.cards.find(card => card[0] === 'audio');

                audioCard[1].src.should.equal(`${siteUrl}/content/media/snippet-audio.mp3`);
                audioCard[1].thumbnailSrc.should.equal(`${siteUrl}/content/images/snippet-audio-thumb.jpg`);
            });

            it('transforms link markup href to absolute site URL', function () {
                const linkMarkup = mobiledoc.markups.find(markup => markup[0] === 'a');

                linkMarkup[1][1].should.equal(`${siteUrl}/snippet-link`);
            });
        });

        describe('Lexical', function () {
            let snippet, lexicalString;

            before(async function () {
                const snippets = await models.Snippet.findAll();
                snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                should.exist(snippet, 'Lexical snippet should exist');
                lexicalString = snippet.get('lexical');
            });

            it('transforms all media URLs to absolute site URLs', function () {
                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                lexicalString.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
                lexicalString.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-video-thumb.jpg`);
                lexicalString.should.containEql(`${siteUrl}/content/media/snippet-audio.mp3`);
                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-audio-thumb.jpg`);
                lexicalString.should.containEql(`${siteUrl}/snippet-link`);

                // Verify no __GHOST_URL__ placeholders remain
                lexicalString.should.not.containEql('__GHOST_URL__');
            });
        });
    });

    describe('URL transformations with CDN config', function () {
        const cdnUrl = 'https://cdn.example.com/c/site-uuid';

        beforeEach(function () {
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {
                    media: cdnUrl,
                    files: cdnUrl
                }
            }, sinon);
        });

        describe('Mobiledoc', function () {
            it('transforms file card src to files CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const fileCard = mobiledoc.cards.find(card => card[0] === 'file');
                fileCard[1].src.should.equal(`${cdnUrl}/content/files/snippet-document.pdf`);
            });

            it('transforms video card src to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');
                videoCard[1].src.should.equal(`${cdnUrl}/content/media/snippet-video.mp4`);
            });

            it('transforms audio card src to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const audioCard = mobiledoc.cards.find(card => card[0] === 'audio');
                audioCard[1].src.should.equal(`${cdnUrl}/content/media/snippet-audio.mp3`);
            });

            it('transforms image card src to absolute site URL(NOT CDN)', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const imageCard = mobiledoc.cards.find(card => card[0] === 'image');
                imageCard[1].src.should.equal(`${siteUrl}/content/images/snippet-inline.jpg`);
            });

            it('transforms video thumbnailSrc to absolute site URL(NOT CDN)', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Mobiledoc');
                const mobiledoc = JSON.parse(snippet.get('mobiledoc'));

                const videoCard = mobiledoc.cards.find(card => card[0] === 'video');
                videoCard[1].thumbnailSrc.should.equal(`${siteUrl}/content/images/snippet-video-thumb.jpg`);
            });
        });

        describe('Lexical', function () {
            it('transforms file URLs to files CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                lexicalString.should.containEql(`${cdnUrl}/content/files/snippet-document.pdf`);
            });

            it('transforms video/audio URLs to media CDN URL', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                lexicalString.should.containEql(`${cdnUrl}/content/media/snippet-video.mp4`);
                lexicalString.should.containEql(`${cdnUrl}/content/media/snippet-audio.mp3`);
            });

            it('transforms image URLs to absolute site URL(NOT CDN)', async function () {
                const snippets = await models.Snippet.findAll();
                const snippet = snippets.models.find(s => s.get('name') === 'Snippet with all media types - Lexical');
                const lexicalString = snippet.get('lexical');

                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-video-thumb.jpg`);
                lexicalString.should.containEql(`${siteUrl}/content/images/snippet-audio-thumb.jpg`);
            });
        });
    });
});
