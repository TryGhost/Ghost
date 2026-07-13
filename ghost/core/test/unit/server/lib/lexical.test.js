const assert = require('node:assert/strict');
const sinon = require('sinon');
const jsdom = require('jsdom');
const urlUtils = require('../../../../core/shared/url-utils');
const lexicalLib = require('../../../../core/server/lib/lexical');

describe('lib/lexical', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('render()', {timeout: 5000}, function () {
        it('renders', async function () {
            const lexical = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical is ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"rendering.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

            const renderedHtml = await lexicalLib.render(lexical);
            assert.equal(renderedHtml, '<p>Lexical is <strong><em>rendering.</em></strong></p>');
        });

        it('renders all default cards', async function () {
            const lexicalState = JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'image',
                            cardWidth: 'wide',
                            src: '/content/images/2018/04/NatGeo06.jpg',
                            width: 4000,
                            height: 2000,
                            caption: 'Birdies'
                        },
                        {
                            type: 'audio',
                            src: '/content/media/2018/04/testing.mp3',
                            title: 'Test audio file',
                            duration: '00:01:30',
                            mimeType: 'audio/mp3',
                            thumbnailSrc: '/content/media/2018/04/testing_thumb.jpg'
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const rendered = await lexicalLib.render(lexicalState);

            assert(rendered.includes('<figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption">'));
            assert(rendered.includes('<div class="kg-card kg-audio-card">'));
        });

        it(`calls custom renderers passed via options`, async function () {
            const {JSDOM} = jsdom;
            const dom = new JSDOM();
            const document = dom.window.document;

            const nodeRenderers = {
                image: () => {
                    const element = document.createElement('div');
                    element.innerHTML = '<span>CUSTOM</span>';
                    return {element, type: 'inner'};
                }
            };

            const lexicalState = JSON.stringify({
                root: {
                    children: [
                        {
                            type: 'image',
                            cardWidth: 'wide',
                            src: '/content/images/2018/04/NatGeo06.jpg',
                            width: 4000,
                            height: 2000,
                            caption: 'Birdies'
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const rendered = await lexicalLib.render(lexicalState, {nodeRenderers});

            assert(rendered.includes('<span>CUSTOM</span>'));
        });
    });

    describe('urlTransformMap (write path) with scheme-less card URLs', function () {
        // A button card URL entered without a scheme (e.g. `www.example.com/post/#/share`)
        // must be coerced to an absolute URL so it collapses to `__GHOST_URL__`. Otherwise
        // it's stored verbatim and later doubled when resolved against the post URL during
        // email rendering.
        //
        // The url-type transforms resolve against urlUtils.getSiteUrl() internally, so stub
        // it to a fixed domain for deterministic fixtures.
        const siteUrl = 'https://www.example.com/';

        beforeEach(function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns(siteUrl);
        });

        function toTransformReady(lexical) {
            return urlUtils.lexicalToTransformReady(lexical, siteUrl, {
                nodes: lexicalLib.nodes,
                transformMap: lexicalLib.urlTransformMap
            });
        }

        it('collapses a scheme-less same-site button URL to __GHOST_URL__', function () {
            const siteHost = new URL(siteUrl).host; // www.example.com
            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'button',
                        buttonText: 'Share',
                        buttonUrl: `${siteHost}/my-post/#/share`,
                        alignment: 'center'
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const result = JSON.parse(toTransformReady(lexical));
            const button = result.root.children[0];

            assert.equal(button.buttonUrl, '__GHOST_URL__/my-post/#/share');
        });

        it('leaves a pure relative hash button URL untouched', function () {
            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'button',
                        buttonText: 'Share',
                        buttonUrl: '#/share',
                        alignment: 'center'
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const result = JSON.parse(toTransformReady(lexical));
            assert.equal(result.root.children[0].buttonUrl, '#/share');
        });

        it('collapses an already-absolute same-site button URL to __GHOST_URL__', function () {
            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'button',
                        buttonText: 'Share',
                        buttonUrl: `${siteUrl.replace(/\/$/, '')}/my-post/#/share`, // https://www.example.com/my-post/#/share
                        alignment: 'center'
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const result = JSON.parse(toTransformReady(lexical));
            assert.equal(result.root.children[0].buttonUrl, '__GHOST_URL__/my-post/#/share');
        });
    });

    describe('validate()', function () {
        it('returns true for well-formed lexical', async function () {
            const lexical = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical is valid.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

            assert.equal(await lexicalLib.validate(lexical), true);
        });

        it('returns false for malformed lexical', async function () {
            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'unknown-node',
                        version: 1
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            assert.equal(await lexicalLib.validate(lexical), false);
        });
    });
});
