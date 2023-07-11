const {JSDOM} = require('jsdom');
const Prettier = require('prettier');
const Renderer = require('../index');
const {ImageNode, PaywallNode, HtmlNode} = require('@tryghost/kg-default-nodes');

const nodes = [ImageNode, PaywallNode, HtmlNode];

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

    it('renders an image card', function () {
        const imageCard = {
            type: 'image',
            src: '/content/images/2022/11/koenig-lexical.jpg',
            caption: 'This is a caption',
            cardWidth: 'regular'
        };
        lexicalState.root.children.push(imageCard);

        const output = Prettier.format((new Renderer({nodes})).render(JSON.stringify(lexicalState), options), {parser: 'html'});

        const expected =
`<figure class="kg-card kg-image-card kg-card-hascaption">
  <img
    src="/content/images/2022/11/koenig-lexical.jpg"
    class="kg-image"
    alt=""
    loading="lazy"
  />
  <figcaption>This is a caption</figcaption>
</figure>
`;
        output.should.equal(expected);
    });

    it('renders a paywall card', function () {
        const paywallCard = {
            type: 'paywall'
        };

        lexicalState.root.children.push(paywallCard);

        const renderer = new Renderer({nodes});

        const output = Prettier.format(renderer.render(JSON.stringify(lexicalState), options), {parser: 'html'});

        const expected =
`<!--members-only-->
`;
        output.should.equal(expected);
    });

    it('renders HTML card with unclosed tags', function () {
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
                    text: 'Testing',
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

        const output = Prettier.format(renderer.render(JSON.stringify(lexicalState), options), {parser: 'html'});

        const expected =
`<div style="color: red">
  <p>Testing</p>
</div>
`;
        output.should.equal(expected);
    });
});
