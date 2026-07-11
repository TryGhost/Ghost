const assert = require('node:assert/strict');
const sinon = require('sinon');
const jsdom = require('jsdom');
const lexicalLib = require('../../../../core/server/lib/lexical');
const settingsCache = require('../../../../core/shared/settings-cache');

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

        it('passes disabled spacer image settings to video rendering', async function () {
            sinon.stub(settingsCache, 'get').callsFake((key) => {
                return key === 'spacer_image_url_template' ? '' : undefined;
            });

            const lexicalState = JSON.stringify({
                root: {
                    children: [{
                        type: 'video',
                        version: 1,
                        src: '/content/media/video.mp4',
                        fileName: 'video.mp4',
                        width: 1920,
                        height: 1080,
                        duration: 120,
                        thumbnailSrc: '/content/images/video-thumb.jpg',
                        cardWidth: 'regular'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const rendered = await lexicalLib.render(lexicalState);

            assert.doesNotMatch(rendered, /img\.spacergif\.org/);
            assert.doesNotMatch(rendered, /\sposter="/);
        });

        it(`calls custom renderers`, async function () {
            const {JSDOM} = jsdom;
            const dom = new JSDOM();
            const document = dom.window.document;

            const customNodeRenderers = {
                image: () => {
                    const element = document.createElement('div');
                    element.innerHTML = '<span>CUSTOM</span>';
                    return {element, type: 'inner'};
                }
            };

            sinon.stub(lexicalLib, 'customNodeRenderers').get(() => customNodeRenderers);

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

            const rendered = await lexicalLib.render(lexicalState);

            assert(rendered.includes('<span>CUSTOM</span>'));
        });
    });
});
