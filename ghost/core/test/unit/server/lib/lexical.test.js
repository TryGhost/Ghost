const should = require('should');
const lexicalLib = require('../../../../core/server/lib/lexical');

describe('lib/lexical', function () {
    describe('render()', function () {
        it('renders', async function () {
            const lexical = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical is ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"rendering.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

            const renderedHtml = await lexicalLib.render(lexical);
            renderedHtml.should.eql('<p>Lexical is <strong><em>rendering.</em></strong></p>');
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

            rendered.should.containEql('<figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption">');
            rendered.should.containEql('<div class="kg-card kg-audio-card">');
        });
    });
});
