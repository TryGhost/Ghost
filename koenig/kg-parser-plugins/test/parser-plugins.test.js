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

    describe('kgHtmlCardToCard', function () {
        it('parses html wrapped in html card comments into card code', function () {
            const dom = buildDOM('<!--kg-card-begin: html--><div><span>Custom HTML</span></div><!--kg-card-end: html-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.equal('<div><span>Custom HTML</span></div>');
        });

        it('skips other parser plugins', function () {
            const dom = buildDOM('<!--kg-card-begin: html--><img src="http://example.com/image.png"><!--kg-card-end: html-->');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('html');
            section.payload.html.should.equal('<img src="http://example.com/image.png">');
        });

        it('works with surrounding content', function () {
            const dom = buildDOM('<p>One</p>\n<!--kg-card-begin: html-->\n<img src="http://example.com/image.png">\n<!--kg-card-end: html-->\n<p><img src="http://example.com/image2.png"></p>');
            const sections = parser.parse(dom).sections.toArray();
            sections.length.should.equal(3);

            const [p, html, image] = sections;

            p.type.should.equal('markup-section');
            p.markers.head.value.should.equal('One');

            html.type.should.equal('card-section');
            html.name.should.equal('html');
            html.payload.html.should.equal('<img src="http://example.com/image.png">');

            image.type.should.equal('card-section');
            image.name.should.equal('image');
            image.payload.src.should.equal('http://example.com/image2.png');
        });
    });

    describe('kgButtonCardToCard', function () {
        it('parses button card divs into cards', function () {
            const dom = buildDOM('<div class="btn btn-accent" data-kg-card="button"><a href="https://example.com">Testing button</a>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                // HTMLAnchorElement.href is a stringifier returing a full url
                // which is why the trailing slash has been appended
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'left'
            });
        });

        it('parses center alignment class into payload', function () {
            const dom = buildDOM(`
                <div class="btn btn-accent align-center" data-kg-card="button">
                    <a href="https://example.com">
                        Testing  button
                    </a>
                </div>
            `);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'center'
            });
        });

        it('handles arbitrary whitespace in button content', function () {
            const dom = buildDOM(`
                <div class="btn btn-accent" data-kg-card="button">
                    <a href="https://example.com">
                        Testing  button
                    </a>
                </div>
            `);
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('button');
            section.payload.should.deepEqual({
                buttonUrl: 'https://example.com/',
                buttonText: 'Testing button',
                alignment: 'left'
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

    describe('figureIframeToEmbed', function () {
        // YouTube (same structure used for vimeo, instagram, etc)
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://www.youtube.com/watch?v=YTVID","html":"<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/YTVID?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>","type":"video"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
        // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure><!--kg-card-end: embed-->
        // Medium Export HTML <figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>
        // Medium Live HTML <figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>
        // WP <figure class=\"wp-block-embed-youtube \"><div class=\"wp-block-embed__wrapper\">\n<span class=\"embed-youtube\" style=\"text-align:center; display: block;\"><iframe class='youtube-player' type='text/html' width='640' height='360' src='https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent' allowfullscreen='true' style='border:0;'></iframe></span>\n</div></figure>

        it('parses youtube iframe into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>'
            });
        });

        it('parses medium youtube iframe into embed card', function () {
            const dom = buildDOM('<figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe>'
            });
        });

        it('parses wordpress youtube iframe into embed card', function () {
            const dom = buildDOM('<figure class="wp-block-embed-youtube "><div class="wp-block-embed__wrapper"><span class="embed-youtube" style="text-align:center; display: block;"><iframe class=\'youtube-player\' type=\'text/html\' width=\'640\' height=\'360\' src=\'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent\' allowfullscreen=\'true\' style=\'border:0;\'></iframe></span>\n</div></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent',
                html: '<iframe class="youtube-player" type="text/html" width="640" height="360" src="https://www.youtube.com/embed/YTVID?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" allowfullscreen="true" style="border:0;"></iframe>'
            });
        });

        it('parses youtube iframe with caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>My Video</figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>',
                caption: 'My Video'
            });
        });

        it('ignores iframe with relative src', function () {
            const dom = buildDOM('<figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>');
            const sections = parser.parse(dom).sections.toArray();

            sections.should.have.lengthOf(0);
        });
    });

    describe('iframeToEmbed', function () {
        // These are iFrames without a <figure> but may have a <div> or <p> or nothing
        // WP Naked YouTube <div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>
        // Hubspot Naked YouTube <div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>

        it('parses a youtube iframe with a single wrapper div into an embed card', function () {
            const dom = buildDOM('<div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>'
            });
        });

        it('parses a youtube iframe with a double wrapper div + schemaless URL into an embed card', function () {
            const dom = buildDOM('<div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID',
                html: '<iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="https://www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe>'
            });
        });
    });

    describe('figureBlockquoteToEmbed', function () {
        // Twitter
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://twitter.com/iamdevloper/status/1133348012439220226","html":"<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href=\"https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw\">May 28, 2019</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n","type":"rich"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
        // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure><!--kg-card-end: embed-->
        // Medium Export HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>
        // Medium Live HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><iframe data-width="500" data-height="281" width="500" height="281" data-src="/media/6969?postId=890" data-media-id="6969" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1071055431215276033%2FU9-RIlDs_400x400.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/6969?postId=890"></iframe></figure>

        it('parses twitter blockquote into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
            });
        });

        it('parses medium twitter blockquote into embed card', function () {
            const dom = buildDOM('<figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226',
                html: '<blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
            });
        });

        it('parses twitter blockquote with caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption>A Tweet</figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                caption: 'A Tweet'
            });
        });

        it('parses twitter blockquote with linked caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption><a href="https://twitter.com">A Tweet</a></figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                caption: '<a href="https://twitter.com">A Tweet</a>'
            });
        });
    });

    describe('mixtapeEmbed', function () {
        // Mobiledoc {\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"bookmark\",{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"metadata\":{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"title\":\"TypeScript at Slack\",\"description\":\"When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…\",\"author\":\"Felix Rieseberg\",\"publisher\":\"Several People Are Coding\",\"thumbnail\":\"https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png\",\"icon\":\"https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png\"},\"type\":\"bookmark\"}]],\"markups\":[],\"sections\":[[10,0],[1,\"p\",[]]]}
        // Ghost HTML <figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://slack.engineering/typescript-at-slack-a81307fa288d"><div class="kg-bookmark-content"><div class="kg-bookmark-title">TypeScript at Slack</div><div class="kg-bookmark-description">When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png"><span class="kg-bookmark-author">Felix Rieseberg</span><span class="kg-bookmark-publisher">Several People Are Coding</span></div></div><div class="kg-bookmark-thumbnail"><img src="https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png"></div></a></figure>
        // Medium Export HTML <div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>
        it('parses mixtape block with all data', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing title', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing description', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing publisher, but BR is present', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing publisher + no additional br', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
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

