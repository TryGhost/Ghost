const should = require('should');
const lexicalLib = require('../../../../core/server/lib/lexical');

describe('lib/lexical', function () {
    describe('lexicalHtmlRenderer', function () {
        it('renders', function () {
            const lexical = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical is ","type":"text","version":1},{"detail":0,"format":3,"mode":"normal","style":"","text":"rendering.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

            lexicalLib.lexicalHtmlRenderer.render(lexical)
                .should.eql('<p>Lexical is <strong><em>rendering.</em></strong></p>');
        });

        it('renders all default cards', function () {
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

            lexicalLib.lexicalHtmlRenderer.render(lexicalState)
                .should.eql(`
        <figure class="kg-card kg-image-card kg-width-wide">
            <img src="/content/images/2018/04/NatGeo06.jpg" alt="" />
                <figcaption>
                Birdies
                </figcaption>
        </figure>
        `);
        });
    });
});
