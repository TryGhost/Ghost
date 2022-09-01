// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const {JSDOM} = require('jsdom');
const {createParserPlugins} = require('../../');
const PostNodeBuilder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;

const buildDOM = function (html) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins: gallery card', function () {
    let builder, parser, plugins;

    before(function () {
        plugins = createParserPlugins({
            createDocument(html) {
                return (new JSDOM(html)).window.document;
            }
        });
    });

    beforeEach(function () {
        builder = new PostNodeBuilder();
        parser = new DOMParser(builder, {plugins});
    });

    afterEach(function () {
        builder = null;
        parser = null;
    });

    describe('kgGalleryCardToCard', function () {
        // Gallery
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["gallery",{"images":[{ "fileName": "jklm4567.jpeg", "row": 0, "src": "/content/images/2019/06/jklm4567.jpeg", "width": 1200, "height": 800 }, { "fileName": "qurt6789.jpeg", "row": 0, "width": 1200, "height": 800, "src": "/content/images/2019/06/qurt6789.jpeg" }, { "fileName": "zyxw3456.jpeg", "row": 0, "width": 1600, "height": 1066, "src": "/content/images/2019/06/zyxw3456.jpeg" }, { "fileName": "1234abcd.jpeg", "row": 1, "width": 800, "height": 1200, "src": "/content/images/2019/06/1234abcd.jpeg" }]}]], "markups": [], "sections": [[10, 0], [1, "p", []]]}
        // Ghost HTML  <!--kg-card-begin: gallery--><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800"></div> <div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/qurt6789.jpeg" width="1200" height="800"></div></div> <div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.50094 1 0%;"><img src="http://localhost:2368/content/images/2019/06/zyxw3456.jpeg" width="1600" height="1066"></div><div class="kg-gallery-image" style="flex: 0.666667 1 0%;"><img src="http://localhost:2368/content/images/2019/06/1234abcd.jpeg" width="800" height="1200"></div></div></div></figure> <!--kg-card-end: gallery-->

        it('parses kg gallery card html back into a card', function () {
            const dom = buildDOM('<!--kg-card-begin: gallery--><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800"></div> <div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/qurt6789.jpeg" width="1200" height="800"></div></div> <div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.50094 1 0%;"><img src="http://localhost:2368/content/images/2019/06/zyxw3456.jpeg" width="1600" height="1066"></div><div class="kg-gallery-image" style="flex: 0.666667 1 0%;"><img src="http://localhost:2368/content/images/2019/06/1234abcd.jpeg" width="800" height="1200"></div></div></div></figure> <!--kg-card-end: gallery-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(4);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/jklm4567.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'qurt6789.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/qurt6789.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'zyxw3456.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/zyxw3456.jpeg', width: 1600, height: 1066
                },
                {
                    fileName: '1234abcd.jpeg', row: 1, src: 'http://localhost:2368/content/images/2019/06/1234abcd.jpeg', width: 800, height: 1200
                }
            ]);

            should.not.exist(section.payload.caption);
        });

        it('parses kg gallery card with caption', function () {
            const dom = buildDOM('<!--kg-card-begin: gallery--><figure class="kg-card kg-gallery-card kg-width-wide"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800"></div> <div class="kg-gallery-image" style="flex: 1.5 1 0%;"><img src="http://localhost:2368/content/images/2019/06/qurt6789.jpeg" width="1200" height="800"></div></div> <div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.50094 1 0%;"><img src="http://localhost:2368/content/images/2019/06/zyxw3456.jpeg" width="1600" height="1066"></div><div class="kg-gallery-image" style="flex: 0.666667 1 0%;"><img src="http://localhost:2368/content/images/2019/06/1234abcd.jpeg" width="800" height="1200"></div></div></div><figcaption>My <em>exciting</em> caption</figcaption></figure> <!--kg-card-end: gallery-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(4);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/jklm4567.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'qurt6789.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/qurt6789.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'zyxw3456.jpeg', row: 0, src: 'http://localhost:2368/content/images/2019/06/zyxw3456.jpeg', width: 1600, height: 1066
                },
                {
                    fileName: '1234abcd.jpeg', row: 1, src: 'http://localhost:2368/content/images/2019/06/1234abcd.jpeg', width: 800, height: 1200
                }
            ]);

            section.payload.caption.should.eql('My <em>exciting</em> caption');
        });
    });

    describe('grafGalleryToCard', function () {
        // Medium Export HTML <div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div></figure></div>

        it('parses medium export gallery into gallery card', function () {
            const dom = buildDOM('<div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div></figure></div>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(4);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/600/jklm4567.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'qurt6789.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/600/qurt6789.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'zyxw3456.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg', width: 1200, height: 800
                },
                {
                    fileName: '1234abcd.jpeg', row: 1, src: 'https://cdn-images-1.medium.com/max/400/1234abcd.jpeg', width: 800, height: 1200
                }
            ]);

            should.not.exist(section.payload.caption);
        });

        it('can handle graf multiple captions', function () {
            const dom = buildDOM('<div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--h3" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div><figcaption class="imageCaption" style="width: 324.886%; left: -224.886%;">First Caption</figcaption></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 49.983%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50.017%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="1600" data-height="1066" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div><figcaption class="imageCaption" style="width: 199.932%; left: -99.932%;">End Caption</figcaption></figure></div>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(4);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/600/jklm4567.jpeg', width: 1200, height: 800
                },
                {
                    fileName: 'qurt6789.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/600/qurt6789.jpeg', width: 800, height: 1200
                },
                {
                    fileName: 'zyxw3456.jpeg', row: 0, src: 'https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg', width: 1200, height: 800
                },
                {
                    fileName: '1234abcd.jpeg', row: 1, src: 'https://cdn-images-1.medium.com/max/400/1234abcd.jpeg', width: 1600, height: 1066
                }
            ]);

            section.payload.caption.should.eql('First Caption / End Caption');
        });
    });

    describe('sqsGalleriesToCard', function () {
        // Three different variations of galleries:
        // stacked, grid, and slideshow
        // stacked: <div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 1</h3></div></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 2</h3></div></div></div></div>
        // slideshow: <div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"><div class="sqs-gallery"><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-3.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567893" data-type="image" /></div></div></div>

        it('parses a stacked gallery into gallery card', function () {
            const dom = buildDOM('<div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"></div></div></div>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(3);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'test.jpg', row: 0, src: 'https://example.com/test.jpg', width: 2500, height: 1663, alt: 'image alt text'
                },
                {
                    fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text 1'
                },
                {
                    fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 2'
                }
            ]);

            should.not.exist(section.payload.caption);
        });

        it('can handle multiple captions', function () {
            const dom = buildDOM('<div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 1</h3></div></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 2</h3></div></div></div></div>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(3);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'test.jpg', row: 0, src: 'https://example.com/test.jpg', width: 2500, height: 1663, alt: 'image alt text'
                },
                {
                    fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text 1'
                },
                {
                    fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 2'
                }
            ]);

            section.payload.caption.should.eql('Image caption 1 / Image caption 2');
        });

        it('parses a slideshow gallery into gallery card', function () {
            const dom = buildDOM('<div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"><div class="sqs-gallery"><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-3.jpg" alt="image alt text 3"></noscript><img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text 3" data-load="false" data-image-id="1234567893" data-type="image" /></div></div></div>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(4);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'test.jpg', row: 0, src: 'https://example.com/test.jpg', width: 2500, height: 1663, alt: 'image alt text'
                },
                {
                    fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text 1'
                },
                {
                    fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 2'
                },
                {
                    fileName: 'test-3.jpg', row: 1, src: 'https://example.com/test-3.jpg', width: 800, height: 800, alt: 'image alt text 3'
                }
            ]);

            should.not.exist(section.payload.caption);
        });

        it('parses a grid gallery into gallery card', function () {
            const dom = buildDOM('<div class="sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1"><div class="sqs-gallery"><div class="slide" data-type="image" data-animation-role="image"><div class="margin-wrapper"><a data-title data-description data-lightbox-theme href="https://example.com/test-1.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit"><span class="v6-visually-hidden">View fullsize</span><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></a></div></div><div class="slide" data-type="image" data-animation-role="image"><div class="margin-wrapper"><a data-title data-description data-lightbox-theme href="https://example.com/test-2.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit"><span class="v6-visually-hidden">View fullsize</span><noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567892" data-type="image" /></a></div></div></div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('gallery');
            section.payload.should.have.property('images');

            section.payload.images.should.be.an.Array().with.lengthOf(2);
            section.payload.images.should.deepEqual([
                {
                    fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text'
                },
                {
                    fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 1'
                }
            ]);

            should.not.exist(section.payload.caption);
        });
        it('ignores summary item galleries', function () {
            const dom = buildDOM('<div class="summary-item-thing sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1"><div class="sqs-gallery"><div class="slide" data-type="image" data-animation-role="image"><div class="margin-wrapper"><a data-title data-description data-lightbox-theme href="https://example.com/test-1.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit"><span class="v6-visually-hidden">View fullsize</span><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></a></div></div><div class="slide" data-type="image" data-animation-role="image"><div class="margin-wrapper"><a data-title data-description data-lightbox-theme href="https://example.com/test-2.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit"><span class="v6-visually-hidden">View fullsize</span><noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567892" data-type="image" /></a></div></div></div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.not.equal('card-section');
        });
    });
});
