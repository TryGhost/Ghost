const should = require('should');
const converter = require('../../../../../server/lib/mobiledoc/converters/mobiledoc-converter');

describe('Mobiledoc converter', function () {
    describe('default', function () {
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
                            fileName: 'test.png',
                            src: '/test.png',
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

            converter.render(mobiledoc, 2).should.eql('<p>One<br>Two</p><!--kg-card-begin: markdown--><h1 id="markdowncard">Markdown card</h1>\n<p>Some markdown</p>\n<!--kg-card-end: markdown--><p>Three</p><hr><figure class="kg-card kg-image-card kg-width-wide kg-card-hascaption"><img src="/content/images/2018/04/NatGeo06.jpg" class="kg-image"><figcaption>Birdies</figcaption></figure><p>Four</p><!--kg-card-begin: html--><h2>HTML card</h2>\n<div><p>Some HTML</p></div><!--kg-card-end: html--><figure class="kg-card kg-embed-card"><h2>Embed card</h2></figure><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"></div></figure>');
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

            converter.render(mobiledoc, 2).should.eql('<p>Test</p>');
        });

        it('removes single blank paragraph', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [],
                sections: [
                    [1, 'p', []]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('');
        });

        it('removes single blank paragraph with empty content', function () {
            let mobiledoc = {
                version: '0.3.1',
                markups: [],
                atoms: [],
                cards: [],
                sections: [
                    [1, 'p', [
                        [0, [], 0, '']
                    ]]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('');
        });

        it('doesn\'t remove last paragraph if it has markups', function () {
            let mobiledoc = {
                version: '0.3.1',
                markups: [['em']],
                atoms: [],
                cards: [],
                sections: [
                    [1, 'p', [
                        [0, [0], 1, 'This should be kept']
                    ]]
                ]
            };

            converter.render(mobiledoc, 2).should.eql('<p><em>This should be kept</em></p>');
        });

        it('adds id attributes to headings', function () {
            let mobiledoc = {
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [
                    ['a', ['href', 'http://example.com']]
                ],
                sections: [
                    [1, 'h1', [
                        [0, [], 0, 'Heading One']
                    ]],
                    [1, 'h2', [
                        [0, [], 0, 'Heading Two']
                    ]],
                    [1, 'h3', [
                        [0, [], 0, 'Heading Three']
                    ]],
                    [1, 'h4', [
                        [0, [], 0, 'Heading Four']
                    ]],
                    [1, 'h5', [
                        [0, [], 0, 'Heading Five']
                    ]],
                    [1, 'h6', [
                        [0, [], 0, 'Heading Six']
                    ]],
                    // duplicate text
                    [1, 'h1', [
                        [0, [], 0, 'Heading One']
                    ]],
                    [1, 'h3', [
                        [0, [], 0, 'Heading One']
                    ]],
                    // invalid attr chars
                    [1, 'h1', [
                        [0, [], 0, '< left < arrow <']
                    ]],
                    [1, 'h1', [
                        [0, [], 0, '> right > arrow >']
                    ]],
                    [1, 'h1', [
                        [0, [], 0, '"quote" "test"']
                    ]],
                    [1, 'h1', [
                        [0, [], 0, '? question?']
                    ]],
                    [1, 'h1', [
                        [0, [], 0, '& ampersand&']
                    ]],
                    // trailing link
                    [1, 'h1', [
                        [0, [], 0, 'trailing '],
                        [0, [0], 1, 'link']
                    ]],
                    // preceding link
                    [1, 'h1', [
                        [0, [0], 1, 'preceding'],
                        [0, [], 0, ' link']
                    ]]
                ]
            };

            let output = converter.render(mobiledoc, 2);

            // normal headings
            output.should.match(/<h1 id="heading-one">Heading One<\/h1>/);
            output.should.match(/<h2 id="heading-two">Heading Two<\/h2>/);
            output.should.match(/<h3 id="heading-three">Heading Three<\/h3>/);
            output.should.match(/<h4 id="heading-four">Heading Four<\/h4>/);
            output.should.match(/<h5 id="heading-five">Heading Five<\/h5>/);
            output.should.match(/<h6 id="heading-six">Heading Six<\/h6>/);

            // duplicate heading text
            output.should.match(/<h1 id="heading-one-1">Heading One<\/h1>/);
            output.should.match(/<h3 id="heading-one-2">Heading One<\/h3>/);

            // invalid ID/hash-url chars
            output.should.match(/<h1 id="left-arrow">&lt; left &lt; arrow &lt;<\/h1>/);
            output.should.match(/<h1 id="right-arrow">&gt; right &gt; arrow &gt;<\/h1>/);
            output.should.match(/<h1 id="quote-test">"quote" "test"<\/h1>/);
            output.should.match(/<h1 id="question">\? question\?<\/h1>/);
            output.should.match(/<h1 id="ampersand">&amp; ampersand&amp;<\/h1>/);

            // heading with link
            output.should.match(/<h1 id="trailing-link">trailing <a href="http:\/\/example\.com">link<\/a><\/h1>/);
            output.should.match(/<h1 id="preceding-link"><a href="http:\/\/example\.com">preceding<\/a> link<\/h1>/);
        });
    });
});
