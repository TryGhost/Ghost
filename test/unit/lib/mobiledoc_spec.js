const path = require('path');
const should = require('should');
const sinon = require('sinon');
const nock = require('nock');
const configUtils = require('../../utils/configUtils');
const mobiledocLib = require('../../../core/server/lib/mobiledoc');
const storage = require('../../../core/server/adapters/storage');
const urlUtils = require('../../../core/shared/url-utils');
const mockUtils = require('../../utils/mocks');

describe('lib/mobiledoc', function () {
    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
        configUtils.restore();
        // ensure config changes are reset and picked up by next test
        mobiledocLib.reload();
        mockUtils.modules.unmockNonExistentModule(/sharp/);
    });

    describe('mobiledocHtmlRenderer', function () {
        it('renders all default cards and atoms', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [
                    ['soft-return', '', {}]
                ],
                cards: [
                    ['markdown', {
                        markdown: '# Markdown card\nSome markdown'
                    }],
                    ['hr', {}],
                    ['image', {
                        cardWidth: 'wide',
                        src: '/content/images/2018/04/NatGeo06.jpg',
                        width: 4000,
                        height: 2000,
                        caption: 'Birdies'
                    }],
                    ['html', {
                        html: '<h2>HTML card</h2>\n<div><p>Some HTML</p></div>'
                    }],
                    ['embed', {
                        html: '<h2>Embed card</h2>'
                    }],
                    ['gallery', {
                        images: [{
                            row: 0,
                            fileName: 'test.png',
                            src: '/content/images/test.png',
                            width: 1000,
                            height: 500
                        }]
                    }]
                ],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'One'],
                        [1, [], 0, 0],
                        [0, [], 0, 'Two']
                    ]],
                    [10, 0],
                    [1, 'p', [
                        [0, [], 0, 'Three']
                    ]],
                    [10, 1],
                    [10, 2],
                    [1, 'p', [
                        [0, [], 0, 'Four']
                    ]],
                    [10, 3],
                    [10, 4],
                    [10, 5],
                    [1, 'p', []]
                ]
            };

            mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc)
                .should.eql('<p>One<br>Two</p><!--kg-card-begin: markdown--><h1 id="markdowncard">Markdown card</h1>\n<p>Some markdown</p>\n<!--kg-card-end: markdown--><p>Three</p><hr><figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image" alt srcset="/content/images/size/w600/2018/04/NatGeo06.jpg 600w, /content/images/size/w1000/2018/04/NatGeo06.jpg 1000w, /content/images/size/w1600/2018/04/NatGeo06.jpg 1600w, /content/images/size/w2400/2018/04/NatGeo06.jpg 2400w" sizes="(min-width: 1200px) 1200px"><figcaption>Birdies</figcaption></figure><p>Four</p><!--kg-card-begin: html--><h2>HTML card</h2>\n<div><p>Some HTML</p></div><!--kg-card-end: html--><figure class="kg-card kg-embed-card"><h2>Embed card</h2></figure><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/test.png" width="1000" height="500" alt srcset="/content/images/size/w600/test.png 600w, /content/images/test.png 1000w" sizes="(min-width: 720px) 720px"></div></div></div></figure>');
        });

        it('respects srcsets config', function () {
            configUtils.set('imageOptimization:srcsets', false);

            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [
                    ['image', {
                        cardWidth: 'wide',
                        src: '/content/images/2018/04/NatGeo06.jpg',
                        width: 4000,
                        height: 2000,
                        caption: 'Birdies'
                    }],
                    ['gallery', {
                        images: [{
                            row: 0,
                            fileName: 'test.png',
                            src: '/content/images/test.png',
                            width: 1000,
                            height: 500
                        }]
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0],
                    [10, 1]
                ]
            };

            mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc)
                .should.eql('<figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image" alt><figcaption>Birdies</figcaption></figure><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/test.png" width="1000" height="500" alt></div></div></div></figure>');
        });

        it('does not render srcsets for non-resizable images', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [
                    ['image', {
                        cardWidth: '',
                        src: '/content/images/2020/07/animated.gif',
                        width: 4000,
                        height: 2000
                    }]
                ],
                markups: [],
                sections: [[10, 0]]
            };

            mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc)
                .should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2020/07/animated.gif" class="kg-image" alt></figure>');
        });

        it('does not render srcsets when sharp is not available', function () {
            mockUtils.modules.mockNonExistentModule('sharp', new Error(), true);

            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [
                    ['image', {
                        src: '/content/images/2018/04/NatGeo06.jpg',
                        width: 4000,
                        height: 2000
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            };

            mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc)
                .should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image" alt></figure>');
        });

        it('does not render srcsets with incompatible storage engine', function () {
            sinon.stub(storage.getStorage(), 'saveRaw').value(null);

            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [
                    ['image', {
                        src: '/content/images/2018/04/NatGeo06.jpg',
                        width: 4000,
                        height: 2000
                    }]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            };

            mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc)
                .should.eql('<figure class="kg-card kg-image-card"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image" alt></figure>');
        });
    });

    describe('populateImageSizes', function () {
        let originalStoragePath;

        beforeEach(function () {
            originalStoragePath = storage.getStorage().storagePath;
            storage.getStorage().storagePath = path.join(__dirname, '../../utils/fixtures/images/');
        });

        afterEach(function () {
            storage.getStorage().storagePath = originalStoragePath;
        });

        it('works', async function () {
            let mobiledoc = {
                cards: [
                    ['image', {src: '/content/images/ghost-logo.png'}],
                    ['image', {src: 'http://example.com/external.jpg'}],
                    ['image', {src: 'https://images.unsplash.com/favicon_too_large?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'}],
                    ['image', {}]
                ]
            };

            const unsplashMock = nock('https://images.unsplash.com/')
                .get('/favicon_too_large')
                .query(true)
                .replyWithFile(200, path.join(__dirname, '../../utils/fixtures/images/favicon_not_square.png'), {
                    'Content-Type': 'image/png'
                });

            const transformedMobiledoc = await mobiledocLib.populateImageSizes(JSON.stringify(mobiledoc));
            const transformed = JSON.parse(transformedMobiledoc);

            unsplashMock.isDone().should.be.true();

            transformed.cards.length.should.equal(4);
        });

        // images can be stored with and without subdir when a subdir is configured
        // but storage adapter always needs paths relative to content dir
        it('works with subdir', async function () {
            // urlUtils is a class instance and won't pick up changes to config so
            // it's necessary to stub out the internals used by
            sinon.stub(urlUtils, 'getSubdir').returns('/subdir');

            let mobiledoc = {
                cards: [
                    ['image', {src: '/content/images/ghost-logo.png'}],
                    ['image', {src: '/subdir/content/images/ghost-logo.png'}]
                ]
            };

            const transformedMobiledoc = await mobiledocLib.populateImageSizes(JSON.stringify(mobiledoc));
            const transformed = JSON.parse(transformedMobiledoc);

            transformed.cards.length.should.equal(2);

            should.exist(transformed.cards[0][1].width);
            transformed.cards[0][1].width.should.equal(800);
            should.exist(transformed.cards[0][1].height);
            transformed.cards[0][1].height.should.equal(257);

            should.exist(transformed.cards[1][1].width);
            transformed.cards[1][1].width.should.equal(800);
            should.exist(transformed.cards[1][1].height);
            transformed.cards[1][1].height.should.equal(257);
        });
    });
});
