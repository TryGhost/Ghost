const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {GalleryNode, $createGalleryNode, $isGalleryNode} = require('../../');
const {ImageNode} = require('../../');

// include ImageNode so we can make sure imported sibling nodes do not get
// processed by other lower priority nodes when skipped with dataset.hasBeenProcessed
const editorNodes = [GalleryNode, ImageNode];

describe('GalleryNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = testFn => function (done) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            images: [
                {
                    row: 0,
                    fileName: 'NatGeo01.jpg',
                    src: '/content/images/2018/08/NatGeo01-9.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 0,
                    fileName: 'NatGeo02.jpg',
                    src: '/content/images/2018/08/NatGeo02-10.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 0,
                    fileName: 'NatGeo03.jpg',
                    src: '/content/images/2018/08/NatGeo03-6.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo04.jpg',
                    src: '/content/images/2018/08/NatGeo04-7.jpg',
                    alt: 'Alt test',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo05.jpg',
                    src: '/content/images/2018/08/NatGeo05-4.jpg',
                    title: 'Title test',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo06.jpg',
                    src: '/content/images/2018/08/NatGeo06-6.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 2,
                    fileName: 'NatGeo07.jpg',
                    src: '/content/images/2018/08/NatGeo07-5.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 2,
                    fileName: 'NatGeo09.jpg',
                    src: '/content/images/2018/08/NatGeo09-8.jpg',
                    width: 3200,
                    height: 1600,
                    href: 'https://example.com'
                }
            ],
            caption: 'Test caption'
        };

        exportOptions = {
            imageOptimization: {
                defaultMaxWidth: 2000,
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            canTransformImage: () => true,
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isGalleryNode', editorTest(function () {
        const node = $createGalleryNode(dataset);
        $isGalleryNode(node).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);

            galleryNode.getImages().should.deepEqual(dataset.images);
            galleryNode.getCaption().should.equal(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const galleryNode = $createGalleryNode();

            galleryNode.getImages().should.deepEqual([]);
            galleryNode.setImages([{src: 'image1.jpg'}]);
            galleryNode.getImages().should.deepEqual([{src: 'image1.jpg'}]);

            galleryNode.getCaption().should.equal('');
            galleryNode.setCaption('New caption');
            galleryNode.getCaption().should.equal('New caption');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);

            galleryNode.getDataset().should.deepEqual(dataset);
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'gallery',
                        ...dataset
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [galleryNode] = $getRoot(editor).getChildren();

                    galleryNode.getImages().should.deepEqual(dataset.images);
                    galleryNode.getCaption().should.equal(dataset.caption);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);
            const json = galleryNode.exportJSON();

            json.should.deepEqual({
                type: 'gallery',
                version: 1,
                images: dataset.images,
                caption: dataset.caption
            });
        }));
    });

    describe('importDOM', function () {
        it('parses gallery card', editorTest(function () {
            const dom = (new JSDOM(`
                <!--kg-card-begin: gallery-->
                <figure class="kg-card kg-gallery-card kg-width-wide">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image" style="flex: 1.5 1 0%;">
                                <a href="https://example.com/1">
                                    <img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800">
                                </a>
                            </div>
                            <div class="kg-gallery-image" style="flex: 1.5 1 0%;">
                                <img src="http://localhost:2368/content/images/2019/06/qurt6789.jpeg" width="1200" height="800"></div>
                            </div>
                            <div class="kg-gallery-row"><div class="kg-gallery-image" style="flex: 1.50094 1 0%;">
                                <a href="https://example.com/3">
                                    <img src="http://localhost:2368/content/images/2019/06/zyxw3456.jpeg" width="1600" height="1066">
                                </a>
                            </div>
                            <div class="kg-gallery-image" style="flex: 0.666667 1 0%;">
                                <img src="http://localhost:2368/content/images/2019/06/1234abcd.jpeg" width="800" height="1200">
                            </div>
                        </div>
                    </div>
                    <figcaption>My <em>exciting</em> caption</figcaption>
                </figure>
                <!--kg-card-end: gallery-->
            `)).window.document;

            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            nodes[0].getImages().should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg',
                    row: 0,
                    src: 'http://localhost:2368/content/images/2019/06/jklm4567.jpeg',
                    width: 1200,
                    height: 800,
                    href: 'https://example.com/1'
                },
                {
                    fileName: 'qurt6789.jpeg',
                    row: 0,
                    src: 'http://localhost:2368/content/images/2019/06/qurt6789.jpeg',
                    width: 1200,
                    height: 800
                },
                {
                    fileName: 'zyxw3456.jpeg',
                    row: 0,
                    src: 'http://localhost:2368/content/images/2019/06/zyxw3456.jpeg',
                    width: 1600,
                    height: 1066,
                    href: 'https://example.com/3'
                },
                {
                    fileName: '1234abcd.jpeg',
                    row: 1,
                    src: 'http://localhost:2368/content/images/2019/06/1234abcd.jpeg',
                    width: 800,
                    height: 1200
                }
            ]);

            nodes[0].getCaption().should.equal('My <em>exciting</em> caption');
        }));

        it('parses Medium gallery', editorTest(function () {
            // Medium Export HTML <div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div></figure></div>
            const dom = (new JSDOM(`
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg">
                        </div>
                    </figure>
                </div>
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg">
                        </div>
                    </figure>
                </div>
            `)).window.document;

            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            nodes[0].getImages().should.deepEqual([
                {
                    fileName: 'jklm4567.jpeg',
                    row: 0,
                    src: 'https://cdn-images-1.medium.com/max/600/jklm4567.jpeg',
                    width: 1200,
                    height: 800
                },
                {
                    fileName: 'qurt6789.jpeg',
                    row: 0,
                    src: 'https://cdn-images-1.medium.com/max/600/qurt6789.jpeg',
                    width: 1200,
                    height: 800
                },
                {
                    fileName: 'zyxw3456.jpeg',
                    row: 0,
                    src: 'https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg',
                    width: 1200,
                    height: 800
                },
                {
                    fileName: '1234abcd.jpeg',
                    row: 1,
                    src: 'https://cdn-images-1.medium.com/max/400/1234abcd.jpeg',
                    width: 800,
                    height: 1200
                }
            ]);

            nodes[0].getCaption().should.equal('');
        }));

        it('handles Medium galleries with multiple captions', editorTest(function () {
            const dom = (new JSDOM(`
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--h3" style="width: 69.22%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="qurt6789.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg">
                        </div>
                        <figcaption class="imageCaption" style="width: 324.886%; left: -224.886%;">First Caption</figcaption>
                    </figure>
                </div>
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 49.983%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50.017%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="1234abcd.jpeg" data-width="1600" data-height="1066" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg">
                        </div>
                        <figcaption class="imageCaption" style="width: 199.932%; left: -99.932%;">End Caption</figcaption>
                    </figure>
                </div>
            `)).window.document;

            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);

            nodes[0].getCaption().should.equal('First Caption / End Caption');
        }));

        describe('Squarespace galleries', function () {
            // Three different variations of galleries:
            // stacked, grid, and slideshow
            // stacked: <div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 1</h3></div></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 2</h3></div></div></div></div>
            // slideshow: <div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"><div class="sqs-gallery"><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-3.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567893" data-type="image" /></div></div></div>

            it('parses a stacked gallery into gallery card', editorTest(function () {
                const dom = (new JSDOM(`
                    <div class="sqs-gallery-container sqs-gallery-block-stacked">
                        <div class="sqs-gallery">
                            <div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image">
                                <noscript>
                                    <img src="https://example.com/test.jpg" alt="image alt text">
                                </noscript>
                                <img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" />
                            </div>
                            <div class="meta" id="8793002jf84od" data-type="image"></div>
                            <div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image">
                                <noscript>
                                    <img src="https://example.com/test-1.jpg" alt="image alt text 1">
                                </noscript>
                                <img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567891" data-type="image" />
                            </div>
                            <div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image">
                                <noscript>
                                    <img src="https://example.com/test-2.jpg" alt="image alt text 2">
                                </noscript>
                                <img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2" data-load="false" data-image-id="1234567892" data-type="image" />
                            </div>
                            <div class="meta" id="8793002jf84od" data-type="image"></div>
                        </div>
                    </div>
                `)).window.document;

                const nodes = $generateNodesFromDOM(editor, dom);
                nodes.length.should.equal(1);

                nodes[0].getType().should.equal('gallery');

                const images = nodes[0].getImages();

                images.should.be.an.Array().with.lengthOf(3);
                images.should.deepEqual([
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

                nodes[0].getCaption().should.equal('');
            }));

            it('can handle multiple captions', editorTest(function () {
                const dom = (new JSDOM(`
                    <div class="sqs-gallery-container sqs-gallery-block-stacked">
                        <div class="sqs-gallery">
                            <div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image">
                                <noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript>
                                <img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" />
                            </div>
                            <div class="meta" id="8793002jf84od" data-type="image">
                                <div class="meta-inside">
                                    <h3 class="meta-title">Image caption 1</h3>
                                </div>
                            </div>
                            <div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image">
                                <noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1"></noscript>
                                <img class="thumb-image" data-src="https://example.com/test-1.jpg"  data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1"  data-load="false"  data-image-id="1234567891" data-type="image" />
                            </div>
                            <div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image">
                                <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2"></noscript>
                                <img class="thumb-image" data-src="https://example.com/test-2.jpg"  data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2"  data-load="false"  data-image-id="1234567892" data-type="image" />
                            </div>
                            <div class="meta" id="8793002jf84od" data-type="image">
                                <div class="meta-inside">
                                    <h3 class="meta-title">Image caption 2</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                `)).window.document;

                const nodes = $generateNodesFromDOM(editor, dom);
                nodes.length.should.equal(1);

                const images = nodes[0].getImages();
                images.should.be.an.Array().with.lengthOf(3);
                images.should.deepEqual([
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

                nodes[0].getCaption().should.eql('Image caption 1 / Image caption 2');
            }));

            it('parses a slideshow gallery into gallery card', editorTest(function () {
                const dom = (new JSDOM(`
                    <div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom">
                        <div class="sqs-gallery">
                            <div class="slide content-fill" data-type="image" data-click-through-url>
                                <noscript><img src="https://example.com/test.jpg" alt="image alt text" /></noscript>
                                <img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" />
                            </div>
                            <div class="slide content-fill" data-type="image" data-click-through-url>
                                <noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1" /></noscript>
                                <img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567891" data-type="image" />
                            </div>
                            <div class="slide content-fill" data-type="image" data-click-through-url>
                                <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2" /></noscript>
                                <img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 2" data-load="false" data-image-id="1234567892" data-type="image" />
                            </div>
                            <div class="slide content-fill" data-type="image" data-click-through-url>
                                <noscript><img src="https://example.com/test-3.jpg" alt="image alt text 3" /></noscript>
                                <img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text 3" data-load="false" data-image-id="1234567893" data-type="image" />
                            </div>
                        </div>
                    </div>
                `)).window.document;

                const nodes = $generateNodesFromDOM(editor, dom);
                nodes.length.should.equal(1);

                const images = nodes[0].getImages();
                images.should.be.an.Array().with.lengthOf(4);
                images.should.deepEqual([
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

                nodes[0].getCaption().should.equal('');
            }));

            it('parses a grid gallery into gallery card', editorTest(function () {
                const dom = (new JSDOM(`
                    <div class="sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1">
                        <div class="sqs-gallery">
                            <div class="slide" data-type="image" data-animation-role="image">
                                <div class="margin-wrapper">
                                    <a data-title data-description data-lightbox-theme href="https://example.com/test-1.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit">
                                        <span class="v6-visually-hidden">View fullsize</span>
                                        <noscript><img src="https://example.com/test-1.jpg" alt="image alt text" /></noscript>
                                        <img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" />
                                    </a>
                                </div>
                            </div>
                            <div class="slide" data-type="image" data-animation-role="image">
                                <div class="margin-wrapper">
                                    <a data-title data-description data-lightbox-theme href="https://example.com/test-2.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit">
                                        <span class="v6-visually-hidden">View fullsize</span>
                                        <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1" /></noscript>
                                        <img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567892" data-type="image" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `)).window.document;

                const nodes = $generateNodesFromDOM(editor, dom);
                nodes.length.should.equal(1);

                const images = nodes[0].getImages();
                images.should.be.an.Array().with.lengthOf(2);
                images.should.deepEqual([
                    {
                        fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text'
                    },
                    {
                        fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 1'
                    }
                ]);

                nodes[0].getCaption().should.equal('');
            }));

            it('ignores summary item galleries', editorTest(function () {
                const dom = (new JSDOM(`
                    <div class="summary-item-thing sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1">
                        <div class="sqs-gallery">
                            <div class="slide" data-type="image" data-animation-role="image">
                                <div class="margin-wrapper">
                                    <a data-title data-description data-lightbox-theme href="https://example.com/test-1.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit">
                                        <span class="v6-visually-hidden">View fullsize</span>
                                        <noscript><img src="https://example.com/test-1.jpg" alt="image alt text" /></noscript>
                                        <img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" />
                                    </a>
                                </div>
                            </div>
                            <div class="slide" data-type="image" data-animation-role="image">
                                <div class="margin-wrapper">
                                    <a data-title data-description data-lightbox-theme href="https://example.com/test-2.jpg" role="button" class="image-slide-anchor js-gallery-lightbox-opener content-fit">
                                        <span class="v6-visually-hidden">View fullsize</span>
                                        <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1" /></noscript>
                                        <img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text 1" data-load="false" data-image-id="1234567892" data-type="image" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `)).window.document;

                const nodes = $generateNodesFromDOM(editor, dom);
                nodes.length.should.not.equal(1);
                nodes[0].getType().should.not.equal('gallery');
            }));
        });
    });

    describe('exportDOM', function () {
        it('renders nothing with no images', editorTest(function () {
            const galleryNode = $createGalleryNode({images: [], caption: null});
            const {element} = galleryNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));

        it('renders nothing with no valid images', editorTest(function () {
            const galleryNode = $createGalleryNode({images: [{src: 'undefined'}], caption: null});
            const {element} = galleryNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));

        it('renders', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);
            const {element} = galleryNode.exportDOM({...exportOptions, canTransformImage: () => false});

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo02-10.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo04-7.jpg" width="3200" height="1600" loading="lazy" alt="Alt test" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo05-4.jpg" width="3200" height="1600" loading="lazy" alt="" title="Title test" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo06-6.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo07-5.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image">
                                <a href="https://example.com"><img src="/content/images/2018/08/NatGeo09-8.jpg" width="3200" height="1600" loading="lazy" alt="" /></a>
                            </div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        }));

        it('renders images with alt text', editorTest(function () {
            const galleryNode = $createGalleryNode({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600,
                        alt: 'alt test'
                    }
                ],
                caption: 'Test caption'
            });
            const {element} = galleryNode.exportDOM({...exportOptions, canTransformImage: () => false});

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="alt test" /></div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        }));

        it('renders images with blank alt text', editorTest(function () {
            const galleryNode = $createGalleryNode({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: 'Test caption'
            });
            const {element} = galleryNode.exportDOM({...exportOptions, canTransformImage: () => false});

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        }));

        it('skips invalid images', editorTest(function () {
            const galleryNode = $createGalleryNode({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '/content/images/2018/08/NatGeo02-10.jpg'
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo03.jpg',
                        src: '/content/images/2018/08/NatGeo03-6.jpg',
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: 'Test caption'
            });
            const {element} = galleryNode.exportDOM({...exportOptions, canTransformImage: () => false});

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        }));

        it('outputs width/height matching default max image width', editorTest(function () {
            const galleryNode = $createGalleryNode({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2500,
                        height: 1800
                    }
                ]
            });

            const {element} = galleryNode.exportDOM(exportOptions);

            const output = element.outerHTML;

            // local is resized
            output.should.match(/width="2000"/);
            output.should.match(/height="1000"/);
            output.should.not.match(/width="3200"/);
            output.should.not.match(/height="1600"/);

            // unsplash is not
            output.should.match(/width="2500"/);
            output.should.match(/height="1800"/);
        }));

        describe('srcset', function () {
            it('is included when image src is relative or Unsplash', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '/subdir/support/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2000,
                        height: 1600
                    }]
                });

                delete exportOptions.imageOptimization.defaultMaxWidth;
                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.prettifyTo(html`
                    <figure class="kg-card kg-gallery-card kg-width-wide">
                        <div class="kg-gallery-container">
                            <div class="kg-gallery-row">
                                <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="/subdir/support/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="/subdir/support/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /subdir/support/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /subdir/support/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /subdir/support/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ" width="2000" height="1600" loading="lazy" alt="" srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2000w" sizes="(min-width: 720px) 720px" /></div>
                            </div>
                        </div>
                    </figure>
                `);
            }));

            it('is included when image src is absolute or __GHOST_URL__', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: 'https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '__GHOST_URL__/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                });

                delete exportOptions.imageOptimization.defaultMaxWidth;
                exportOptions.siteUrl = 'https://localhost:2368';
                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.prettifyTo(html`
                    <figure class="kg-card kg-gallery-card kg-width-wide">
                        <div class="kg-gallery-container">
                            <div class="kg-gallery-row">
                                <div class="kg-gallery-image"><img src="https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="https://localhost:2368/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, https://localhost:2368/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, https://localhost:2368/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, https://localhost:2368/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="__GHOST_URL__/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="__GHOST_URL__/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, __GHOST_URL__/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, __GHOST_URL__/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, __GHOST_URL__/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                            </div>
                        </div>
                    </figure>
                `);
            }));

            it('is omitted when target === email', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                });

                delete exportOptions.imageOptimization.defaultMaxWidth;
                exportOptions.target = 'email';
                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.not.containEql('srcset=');
            }));

            it('is omitted when no contentImageSizes are passed as options', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                });

                delete exportOptions.imageOptimization.contentImageSizes;
                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.not.containEql('srcset=');
            }));

            it('is omitted when `srcsets: false` is passed as an options', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                });

                exportOptions.imageOptimization.srcsets = false;
                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.not.containEql('srcset=');
            }));
        });

        describe('sizes', function () {
            it('is included for images over 720px', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                });

                const {element} = galleryNode.exportDOM(exportOptions);

                const output = element.outerHTML;
                const sizes = output.match(/sizes="(.*?)"/g);

                sizes.length.should.equal(2);

                output.should.match(/standard\.jpg 720w" sizes="\(min-width: 720px\) 720px"/);
                output.should.match(/photo\?w=2000 2000w" sizes="\(min-width: 720px\) 720px"/);
            }));

            it('uses "wide" media query for large single-image galleries', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 2000,
                        height: 1600
                    }]
                });

                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.match(/standard\.jpg 2000w" sizes="\(min-width: 1200px\) 1200px"/);
            }));

            it('uses "standard" media query for medium single-image galleries', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 1000,
                        height: 1600
                    }]
                });

                const {element} = galleryNode.exportDOM(exportOptions);

                element.outerHTML.should.match(/standard\.jpg 1000w" sizes="\(min-width: 720px\) 720px"/);
            }));

            it('is omitted when srcsets are not available', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                });

                exportOptions.imageOptimization.srcsets = false;
                const {element} = galleryNode.exportDOM(exportOptions);

                const output = element.outerHTML;
                const sizes = output.match(/sizes="(.*?)"/g);

                should.not.exist(sizes);
            }));
        });

        describe('email target', function () {
            beforeEach(function () {
                exportOptions.target = 'email';
            });

            it('adds width/height and uses resized images', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 300,
                        height: 800
                    }, {
                        row: 1,
                        fileName: 'photo.jpg',
                        src: '/content/images/2018/08/photo.jpg',
                        width: 2000,
                        height: 1600
                    }, {
                        row: 1,
                        fileName: 'unsplash.jpg',
                        src: 'https://images.unsplash.com/unsplash.jpg?w=2000',
                        width: 2000,
                        height: 1600
                    }]
                });

                const {element} = galleryNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                // 3 images wider than 600px template width resized to fit
                output.match(/width="600"/g).length.should.equal(3);
                // 1 image smaller than template width
                output.should.match(/width="300"/);

                output.should.match(/height="1333"/);
                output.should.match(/height="800"/);
                output.should.match(/height="480"/);

                // original because image is < 1600
                output.should.match(/\/content\/images\/2018\/08\/standard\.jpg/);
                // original because image is < 300
                output.should.match(/\/subdir\/support\/content\/images\/2018\/08\/small\.jpg/);
                // resized because image is > 1600
                output.should.match(/\/content\/images\/size\/w1600\/2018\/08\/photo\.jpg/);
                // resized unsplash image
                output.should.match(/https:\/\/images\.unsplash\.com\/unsplash\.jpg\?w=1200/);
            }));

            it('resizes width/height attributes but uses original image when local image can\'t be transformed', editorTest(function () {
                const galleryNode = $createGalleryNode({
                    images: [{
                        row: 0,
                        fileName: 'image.png',
                        src: '/content/images/2020/06/image.png',
                        width: 3000,
                        height: 2000
                    }]
                });

                exportOptions.canTransformImage = () => false;

                const {element} = galleryNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                output.should.not.match(/width="3000"/);
                output.should.match(/width="600"/);
                output.should.not.match(/height="2000"/);
                output.should.match(/height="400"/);
                output.should.not.match(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/);
                output.should.match(/\/content\/images\/2020\/06\/image\.png/);
            }));
        });
    });
});
