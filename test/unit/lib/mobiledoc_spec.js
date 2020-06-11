const should = require('should');
const configUtils = require('../../utils/configUtils');
const mobiledocLib = require('../../../core/server/lib/mobiledoc');

describe('lib/mobiledoc', function () {
    beforeEach(function () {
        configUtils.set('url', 'https://example.com');
    });

    afterEach(function () {
        configUtils.restore();
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
                .should.eql('<p>One<br>Two</p><!--kg-card-begin: markdown--><h1 id="markdowncard">Markdown card</h1>\n<p>Some markdown</p>\n<!--kg-card-end: markdown--><p>Three</p><hr><figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image" srcset="/content/images/size/w600/2018/04/NatGeo06.jpg 600w, /content/images/size/w1000/2018/04/NatGeo06.jpg 1000w, /content/images/size/w1600/2018/04/NatGeo06.jpg 1600w, /content/images/size/w2400/2018/04/NatGeo06.jpg 2400w"><figcaption>Birdies</figcaption></figure><p>Four</p><!--kg-card-begin: html--><h2>HTML card</h2>\n<div><p>Some HTML</p></div><!--kg-card-end: html--><figure class="kg-card kg-embed-card"><h2>Embed card</h2></figure><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/content/images/test.png" width="1000" height="500" srcset="/content/images/size/w600/test.png 600w, /content/images/size/w1000/test.png 1000w, /content/images/size/w1600/test.png 1600w, /content/images/size/w2400/test.png 2400w"></div></div></div></figure>');
        });
    });
});
