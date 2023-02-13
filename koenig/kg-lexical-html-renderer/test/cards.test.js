const {JSDOM} = require('jsdom');
const Prettier = require('prettier');
const Renderer = require('../index');
const {ImageNode} = require('@tryghost/kg-default-nodes');

const nodes = [ImageNode];

describe('Cards', function () {
    let lexicalState;
    let options;

    beforeEach(async function () {
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
`<figure class="kg-card kg-image-card">
  <img src="/content/images/2022/11/koenig-lexical.jpg" alt="" loading="lazy" />
  <figcaption>This is a caption</figcaption>
</figure>
`;
        output.should.equal(expected);
    });
});
