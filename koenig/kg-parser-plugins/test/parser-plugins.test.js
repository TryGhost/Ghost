// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {JSDOM} = require('jsdom');
const {createParserPlugins} = require('../');
const PostNodeBuilder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;

const buildDOM = function (html) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins', function () {
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

    describe('createParserPlugins', function () {
        it('errors in Node.js env without a `createDocument` option', function () {
            should(function () {
                createParserPlugins();
            }).throw('createParserPlugins() must be passed a `createDocument` function as an option when used in a non-browser environment');
        });
    });

    describe('kgCalloutCardToCard', function () {
        it('parses button card divs into cards', function () {
            const dom = buildDOM('<div class="kg-callout-card"><div class="kg-callout-emoji">⚠️</div><div class="kg-callout-text">This is a callout</div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('callout');
            section.payload.should.deepEqual({
                calloutEmoji: '⚠️',
                calloutText: 'This is a callout',
                backgroundColor: '#F1F3F4'
            });
        });

        it('parses the background-color correctly', function () {
            const dom = buildDOM('<div class="kg-callout-card" style="background-color: red;"><div class="kg-callout-emoji">⚠️</div><div class="kg-callout-text">This is a callout</div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('callout');
            section.payload.should.deepEqual({
                calloutEmoji: '⚠️',
                calloutText: 'This is a callout',
                backgroundColor: 'red'
            });
        });

        it('parses a card without emoji', function () {
            const dom = buildDOM('<div class="kg-callout-card" style="background-color: red;"><div class="kg-callout-text">This is a callout</div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('callout');
            section.payload.should.deepEqual({
                calloutEmoji: '',
                calloutText: 'This is a callout',
                backgroundColor: 'red'
            });
        });
    });

    describe('brToSoftBreakAtom', function () {
        it('parses BR tags to soft-return atoms', function () {
            const dom = buildDOM('Testing<br>Soft-return');

            const [section] = parser.parse(dom).sections.toArray();
            section.tagName.should.equal('p');

            const markers = section.markers.toArray();
            markers.length.should.equal(3);

            const [text1, atom, text2] = markers;
            text1.value.should.equal('Testing');
            atom.name.should.equal('soft-return');
            text2.value.should.equal('Soft-return');
        });
    });

    describe('removeLeadingNewline', function () {
        it('strips newline chars from the beginning of text nodes', function () {
            const dom = buildDOM('<p>\nTesting</p>');

            const [section] = parser.parse(dom).sections.toArray();
            const [marker] = section.markers.toArray();

            marker.value.should.equal('Testing');
        });
    });

    describe('figureToImageCard', function () {
        it('parses IMG inside FIGURE to image card without caption', function () {
            const dom = buildDOM('<figure><img src="http://example.com/test.png" alt="Alt test" title="Title test"></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('image');
            section.payload.should.deepEqual({
                src: 'http://example.com/test.png',
                alt: 'Alt test',
                title: 'Title test'
            });
        });

        it('parses IMG inside FIGURE to image card with caption', function () {
            const dom = buildDOM('<figure><img src="http://example.com/test.png"><figcaption>&nbsp; <strong>Caption test</strong></figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.payload.should.deepEqual({
                src: 'http://example.com/test.png',
                alt: '',
                title: '',
                caption: '<strong>Caption test</strong>'
            });
        });

        it('extracts Koenig card widths', function () {
            const dom = buildDOM('<figure class="kg-card kg-width-wide"><img src="http://example.com/test.png"></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.payload.cardWidth.should.equal('wide');
        });

        it('extracts Medium card widths', function () {
            const dom = buildDOM('<figure class="graf--layoutFillWidth"><img src="http://example.com/test.png"></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.payload.cardWidth.should.equal('full');
        });
    });

    describe('imgToCard', function () {
        it('parses IMG into image card', function () {
            const dom = buildDOM('<img src="http://example.com/test.png" alt="Alt test" title="Title test">');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('image');
            section.payload.should.deepEqual({
                src: 'http://example.com/test.png',
                alt: 'Alt test',
                title: 'Title test'
            });
        });
    });

    describe('hrToCard', function () {
        it('parses HR into hr card', function () {
            const dom = buildDOM('<p>Test 1</p><hr><p>Test 2</p>');
            const [p1, hr, p2] = parser.parse(dom).sections.toArray();

            p1.tagName.should.equal('p');
            p1.markers.head.value.should.equal('Test 1');

            hr.type.should.equal('card-section');
            hr.name.should.equal('hr');

            p2.tagName.should.equal('p');
            p2.markers.head.value.should.equal('Test 2');
        });
    });

    describe('figureToCodeCard', function () {
        it('parses PRE>CODE inside FIGURE into code card', function () {
            // NOTE: skipped and picked up by preCodeToCard
            const dom = buildDOM('<figure><pre><code>Test code</code></pre></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code'
            });
        });

        it('parses PRE>CODE inside FIGURE with FIGCAPTION into code card', function () {
            const dom = buildDOM('<figure><pre><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code',
                caption: 'Test caption'
            });
        });

        it('extracts language from pre class name', function () {
            const dom = buildDOM('<figure><pre class="language-js"><code>Test code</code></pre><figcaption>Test caption</figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code',
                caption: 'Test caption',
                language: 'js'
            });
        });

        it('extracts language from code class name', function () {
            const dom = buildDOM('<figure><pre><code class="language-js">Test code</code></pre><figcaption>Test caption</figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code',
                caption: 'Test caption',
                language: 'js'
            });
        });

        it('correctly skips if there is no pre tag', function () {
            const dom = buildDOM('<figure><div><span class="nothing-to-see-here"></span></div></figure>');
            const sections = parser.parse(dom).sections.toArray();

            sections.should.have.lengthOf(0);
        });
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

    describe('figureScriptToHtmlCard', function () {
        // Gist
        // mobiledoc {"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<script src=\"https://gist.github.com/ErisDS/3a9132089955b2698135257a72fa30cb.js\"></script>"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}

        it('Can convert an embedded gist to an html card', function () {
            const dom = buildDOM('<figure><script src="https://gist.github.com/ErisDS/3a9132089955b2698135257a72fa30cb.js"></script><link rel="stylesheet" href="https://github.githubassets.com/assets/gist-embed-a9a1cf2ca01efd362bfa52312712ae94.css"><div id="gist95747987" class="gist"> <div class="gist-file"> <div class="gist-data"> <div class="js-gist-file-update-container js-task-list-container file-box"> <div id="file-slimer-js" class="file"> <div itemprop="text" class="Box-body p-0 blob-wrapper data type-javascript "> /* Content Ommitted */</div></div></div></div><div class="gist-meta"> <a href="https://gist.github.com/ErisDS/3a9132089955b2698135257a72fa30cb/raw/c22760e77e948934cde4b4a61af7230539071f2a/slimer.js" style="float:right">view raw</a> <a href="https://gist.github.com/ErisDS/3a9132089955b2698135257a72fa30cb#file-slimer-js">slimer.js</a> hosted with ❤ by <a href="https://github.com">GitHub</a> </div></div></div></figure>');

            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.eql('<script src="https://gist.github.com/ErisDS/3a9132089955b2698135257a72fa30cb.js"></script>');
        });

        it('ignores script tag if not for gist', function () {
            const dom = buildDOM('<figure><script src="https://cdn.somewhere.com/3a9132089955b2698135257a72fa30cb.js"></script></figure>');

            const sections = parser.parse(dom).sections.toArray();

            sections.should.have.lengthOf(0);
        });
    });

    describe('preCodeToCard', function () {
        it('parses PRE>CODE into code card', function () {
            const dom = buildDOM('<figure><pre><code>Test code</code></pre></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code'
            });
        });

        it('extracts language from pre class name', function () {
            const dom = buildDOM('<figure><pre class="language-javascript"><code>Test code</code></pre></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code',
                language: 'javascript'
            });
        });

        it('extracts language from code class name', function () {
            const dom = buildDOM('<figure><pre><code class="language-ruby">Test code</code></pre></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('code');
            section.payload.should.deepEqual({
                code: 'Test code',
                language: 'ruby'
            });
        });
    });

    describe('blockquoteWithChildren', function () {
        it('adds line breaks between nested paragraphs', function () {
            const dom = buildDOM('<blockquote><p>My first quote line</p><p>My second quote line</p></blockquote>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('markup-section');
            section.markers.should.have.lengthOf(4);

            const [m1, m2, m3, m4] = section.markers.toArray();
            m1.value.should.equal('My first quote line');
            m2.name.should.equal('soft-return');
            m2.type.should.equal('atom');
            m3.name.should.equal('soft-return');
            m3.type.should.equal('atom');
            m4.value.should.equal('My second quote line');
        });

        it('adds line breaks for many sequential paragraphs', function () {
            const dom = buildDOM('<blockquote><p>My first quote line</p><p>My second quote line</p><p>My third quote line</p><p>My fourth quote line</p></blockquote>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('markup-section');
            section.markers.should.have.lengthOf(10);

            const [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10] = section.markers.toArray();
            m1.value.should.equal('My first quote line');
            m2.name.should.equal('soft-return');
            m2.type.should.equal('atom');
            m3.name.should.equal('soft-return');
            m3.type.should.equal('atom');
            m4.value.should.equal('My second quote line');
            m5.name.should.equal('soft-return');
            m5.type.should.equal('atom');
            m6.name.should.equal('soft-return');
            m6.type.should.equal('atom');
            m7.value.should.equal('My third quote line');
            m8.name.should.equal('soft-return');
            m8.type.should.equal('atom');
            m9.name.should.equal('soft-return');
            m9.type.should.equal('atom');
            m10.value.should.equal('My fourth quote line');
        });

        it('keeps supported markup within blockquotes with nested paragraphs', function () {
            const dom = buildDOM('<blockquote><p>My first quote lined with a <strong>strong</strong> tag</p><p>My second quote line with an <em>em</em> tag</p></blockquote>');
            const [section] = parser.parse(dom).sections.toArray();
            section.type.should.equal('markup-section');
            section.markers.should.have.lengthOf(8);

            const [m1, m2, m3, m4, m5, m6, m7, m8] = section.markers.toArray();
            m1.value.should.equal('My first quote lined with a ');
            m2.value.should.equal('strong');
            m2.markups.should.have.lengthOf(1);
            m3.value.should.equal(' tag');
            m4.name.should.equal('soft-return');
            m4.type.should.equal('atom');
            m5.name.should.equal('soft-return');
            m5.type.should.equal('atom');
            m6.value.should.equal('My second quote line with an ');
            m7.value.should.equal('em');
            m7.markups.should.have.lengthOf(1);
            m8.value.should.equal(' tag');
        });

        it('ignores blockquotes without multiple parapraphs', function () {
            const dom = buildDOM('<blockquote><p>Single nested blockquote</p></blockquote>');
            const [section] = parser.parse(dom).sections.toArray();
            section.type.should.equal('markup-section');
            section.markers.should.have.lengthOf(1);

            const [m1] = section.markers.toArray();
            m1.value.should.equal('Single nested blockquote');
        });

        it('ignores blockquotes with non sequential parapraphs', function () {
            const dom = buildDOM('<blockquote><p>Non-sequential paragraph </p><a href="https://test.com">content</a><p>Second paragraph</p></blockquote>');

            // two sections, as Mobiledoc creates two blockquotes from this markup
            const [section1, section2] = parser.parse(dom).sections.toArray();
            section1.type.should.equal('markup-section');
            section1.markers.should.have.lengthOf(2);

            section2.type.should.equal('markup-section');
            section2.markers.should.have.lengthOf(1);

            const [m1, m2] = section1.markers.toArray();
            m1.value.should.equal('Non-sequential paragraph ');
            m2.value.should.equal('content');

            const [m3] = section2.markers.toArray();
            m3.value.should.equal('Second paragraph');
        });

        it('ignores blockquotes non-paragraph block-level elements', function () {
            const dom = buildDOM('<blockquote><h1>Blockquote header</h1><p>followed by a paragraph</p></blockquote>');

            // two sections, as Mobiledoc creates a separate header element
            const [section1, section2] = parser.parse(dom).sections.toArray();
            section1.type.should.equal('markup-section');
            section1.markers.should.have.lengthOf(1);

            section2.type.should.equal('markup-section');
            section2.markers.should.have.lengthOf(1);

            const [m1] = section1.markers.toArray();
            m1.value.should.equal('Blockquote header');

            const [m2] = section2.markers.toArray();
            m2.value.should.equal('followed by a paragraph');
        });
    });

    describe('tableToHtmlCard', function () {
        it('can parse a table as HTML card', function () {
            const dom = buildDOM('<table style="float:right"><tr><th>Month</th><th>Savings</th></tr><tr><td>January</td><td>$100</td></tr><tr><td>February</td><td>$80</td></tr></table>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.eql('<table style="float:right"><tbody><tr><th>Month</th><th>Savings</th></tr><tr><td>January</td><td>$100</td></tr><tr><td>February</td><td>$80</td></tr></tbody></table>');
        });

        it('can handle table nested in another table', function () {
            const dom = buildDOM('<table id="table1"><tr><th>title1</th><th>title2</th><th>title3</th></tr><tr><td id="nested"><table id="table2"><tr><td>cell1</td><td>cell2</td><td>cell3</td></tr></table></td><td>cell2</td><td>cell3</td></tr><tr><td>cell4</td><td>cell5</td><td>cell6</td></tr></table>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.eql('<table id="table1"><tbody><tr><th>title1</th><th>title2</th><th>title3</th></tr><tr><td id="nested"><table id="table2"><tbody><tr><td>cell1</td><td>cell2</td><td>cell3</td></tr></tbody></table></td><td>cell2</td><td>cell3</td></tr><tr><td>cell4</td><td>cell5</td><td>cell6</td></tr></tbody></table>');
        });
    });
});

