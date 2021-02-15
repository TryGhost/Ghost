// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const Renderer = require('../');

describe('Mobiledoc HTML renderer', function () {
    it('sets default card options', function () {
        let mobiledoc = {
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [['test']],
            sections: [
                [10, 0]
            ]
        };

        let testCard = {
            name: 'test',
            type: 'dom',
            render({env, options}) {
                return env.dom.createTextNode(JSON.stringify(options));
            }
        };

        let renderer = new Renderer({cards: [testCard]});
        let result = JSON.parse(renderer.render(mobiledoc));

        result.target.should.equal('html');
    });

    it('allows card option override', function () {
        let mobiledoc = {
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [['test']],
            sections: [
                [10, 0]
            ]
        };

        let testCard = {
            name: 'test',
            type: 'dom',
            render({env, options}) {
                return env.dom.createTextNode(JSON.stringify(options));
            }
        };

        let renderer = new Renderer({cards: [testCard]});
        let result = JSON.parse(renderer.render(mobiledoc, {target: 'email'}));

        result.target.should.equal('email');
    });

    it('passes card options through to cards when rendering', function () {
        let mobiledoc = {
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [['test']],
            sections: [
                [10, 0]
            ]
        };

        let testCard = {
            name: 'test',
            type: 'dom',
            render({env, options}) {
                let p = env.dom.createElement('p');
                p.appendChild(env.dom.createTextNode(options.testOption));
                return p;
            }
        };

        let renderer = new Renderer({cards: [testCard]});

        renderer.render(mobiledoc, {testOption: 'foo'})
            .should.equal('<p>foo</p>');
    });

    describe('default behaviour', function () {
        let renderer;

        before(function () {
            renderer = new Renderer();
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

            renderer.render(mobiledoc).should.eql('<p>Test</p>');
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

            renderer.render(mobiledoc).should.eql('');
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

            renderer.render(mobiledoc).should.eql('');
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

            renderer.render(mobiledoc).should.eql('<p><em>This should be kept</em></p>');
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

            let output = renderer.render(mobiledoc);

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
