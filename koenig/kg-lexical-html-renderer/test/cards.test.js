const {JSDOM} = require('jsdom');
const Renderer = require('../');
const {ImageNode, PaywallNode, HtmlNode} = require('@tryghost/kg-default-nodes');

const nodes = [ImageNode, PaywallNode, HtmlNode];

const htmlRenderer = (node, options) => {
    const document = options.createDocument();
    const textarea = document.createElement('textarea');
    textarea.value = node.html;
    return {element: textarea, type: 'value'};
};

describe('Cards', function () {
    let lexicalState;
    let options;

    beforeEach(function () {
        lexicalState = {
            root: {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        options = {
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('renders a card', async function () {
        lexicalState.root.children.push({type: 'image'});

        const cardRenderer = () => {
            const document = options.createDocument();
            const img = document.createElement('img');
            img.src = 'https://example.com/image.jpg';
            return {element: img};
        };

        const renderer = new Renderer({nodes});
        const output = await renderer.render(JSON.stringify(lexicalState), {
            ...options,
            nodeRenderers: {
                image: cardRenderer
            }
        });

        const expected = `<img src="https://example.com/image.jpg">`;

        output.should.equal(expected);
    });

    it('renders a card with comments', async function () {
        lexicalState.root.children.push({type: 'paywall'});

        const cardRenderer = () => {
            const document = options.createDocument();
            const div = document.createElement('div');
            div.innerHTML = '<!--members-only-->';
            return {element: div, type: 'inner'};
        };

        const renderer = new Renderer({nodes});
        const output = await renderer.render(JSON.stringify(lexicalState), {
            ...options,
            nodeRenderers: {
                paywall: cardRenderer
            }
        });

        const expected = `<!--members-only-->`;
        output.should.equal(expected);
    });

    it('renders HTML card with unclosed tags', async function () {
        lexicalState.root.children.push({
            type: 'html',
            html: '<div style="color: red">'
        }, {
            children: [
                {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Testing this',
                    type: 'text',
                    version: 1
                }
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
        }, {
            type: 'html',
            html: '</div>'
        });

        const renderer = new Renderer({nodes});
        const output = await renderer.render(JSON.stringify(lexicalState), {
            ...options,
            nodeRenderers: {
                html: htmlRenderer
            }
        });

        const expected = `<div style="color: red"><p>Testing this</p></div>`;
        output.should.equal(expected);
    });

    it('renders HTML card with html entities and single-quote attributes', async function () {
        lexicalState.root.children.push({
            type: 'html',
            html: '<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>'
        });

        const renderer = new Renderer({nodes});
        const output = await renderer.render(JSON.stringify(lexicalState), {
            ...options,
            nodeRenderers: {
                html: htmlRenderer
            }
        });

        const expected = `<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<div data-graph-name='The "all-in" cost of a grant'>Test</div>`;
        output.should.equal(expected);
    });
});
