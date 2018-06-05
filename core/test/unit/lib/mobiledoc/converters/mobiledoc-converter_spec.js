const should = require('should');
const converter = require('../../../../../server/lib/mobiledoc/converters/mobiledoc-converter');

describe('Mobiledoc converter', function () {
    // version 1 === Ghost 1.0 markdown-only renderer
    describe('version 1', function () {
        it('renders correctly', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [
                    ['markdown',
                        {
                            pos: 'top',
                            card_name: 'markdown',
                            markdown: '#heading\n\n- list one\n- list two\n- list three'
                        }
                    ]
                ],
                markups: [],
                sections: [
                    [10, 0]
                ]
            };

            converter.render(mobiledoc).should.eql('<div class="kg-card-markdown"><h1 id="heading">heading</h1>\n<ul>\n<li>list one</li>\n<li>list two</li>\n<li>list three</li>\n</ul>\n</div>');
        });
    });

    // version 2 === Ghost 2.0 full Koenig renderer
    describe('version 2', function () {
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
                        imageStyle: 'wide',
                        src: '/content/images/2018/04/NatGeo06.jpg',
                        caption: 'Birdies'
                    }],
                    ['html', {
                        html: '<h2>HTML card</h2>\n<div><p>Some HTML</p></div>'
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
                    [1, 'p', []]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('<div class="kg-post">\n<p>One<br>Two</p><h1 id="markdowncard">Markdown card</h1>\n<p>Some markdown</p>\n<p>Three</p><hr><figure class="kg-image-card"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image kg-image-wide"><figcaption>Birdies</figcaption></figure><p>Four</p><h2>HTML card</h2>\n<div><p>Some HTML</p></div>\n</div>');
        });

        it('wraps output with a .kg-post div', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Test']
                    ]]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('<div class="kg-post">\n<p>Test</p>\n</div>');
        });

        it('removes final blank paragraph', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, 'Test']
                    ]],
                    [1, 'p', []]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('<div class="kg-post">\n<p>Test</p>\n</div>');
        });
    });
});
