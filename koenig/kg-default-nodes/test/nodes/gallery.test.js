const {createDocument, html} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {GalleryNode, $createGalleryNode, $isGalleryNode} = require('../../');
const {ImageNode} = require('../../');

// include ImageNode so we can make sure imported sibling nodes do not get
// processed by other lower priority nodes when skipped with dataset.hasBeenProcessed
const editorNodes = [GalleryNode, ImageNode];

describe('GalleryNode', function () {
    let editor;
    let dataset;

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
    });

    it('matches node with $isGalleryNode', editorTest(function () {
        const node = $createGalleryNode(dataset);
        $isGalleryNode(node).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);

            galleryNode.images.should.deepEqual(dataset.images);
            galleryNode.caption.should.equal(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const galleryNode = $createGalleryNode();

            galleryNode.images.should.deepEqual([]);
            galleryNode.images = [{src: 'image1.jpg'}];
            galleryNode.images.should.deepEqual([{src: 'image1.jpg'}]);

            galleryNode.caption.should.equal('');
            galleryNode.caption = 'New caption';
            galleryNode.caption.should.equal('New caption');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);

            galleryNode.getDataset().should.deepEqual(dataset);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            GalleryNode.getType().should.equal('gallery');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);
            const galleryNodeDataset = galleryNode.getDataset();
            const clone = GalleryNode.clone(galleryNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...galleryNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            GalleryNode.urlTransformMap.should.deepEqual({
                caption: 'html',
                images: {
                    src: 'url',
                    caption: 'html'
                }
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns false', editorTest(function () {
            const galleryNode = $createGalleryNode(dataset);
            galleryNode.hasEditMode().should.be.false();
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

                    galleryNode.images.should.deepEqual(dataset.images);
                    galleryNode.caption.should.equal(dataset.caption);

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
            const document = createDocument(`
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
            `);

            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            nodes[0].images.should.deepEqual([
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

            nodes[0].caption.should.equal('My <em>exciting</em> caption');
        }));

        it('parses Medium gallery', editorTest(function () {
            // Medium Export HTML <div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div></figure></div>
            const document = createDocument(`
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
            `);

            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            nodes[0].images.should.deepEqual([
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

            nodes[0].caption.should.equal('');
        }));

        it('handles Medium galleries with multiple captions', editorTest(function () {
            const document = createDocument(`
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
            `);

            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);

            nodes[0].caption.should.equal('First Caption / End Caption');
        }));

        describe('Squarespace galleries', function () {
            // Three different variations of galleries:
            // stacked, grid, and slideshow
            // stacked: <div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 1</h3></div></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 2</h3></div></div></div></div>
            // slideshow: <div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"><div class="sqs-gallery"><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-3.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567893" data-type="image" /></div></div></div>

            it('parses a stacked gallery into gallery card', editorTest(function () {
                const document = createDocument(html`
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
                `);

                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);

                nodes[0].getType().should.equal('gallery');

                const images = nodes[0].images;

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

                nodes[0].caption.should.equal('');
            }));

            it('can handle multiple captions', editorTest(function () {
                const document = createDocument(html`
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
                `);

                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);

                const images = nodes[0].images;
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

                nodes[0].caption.should.eql('Image caption 1 / Image caption 2');
            }));

            it('parses a slideshow gallery into gallery card', editorTest(function () {
                const document = createDocument(html`
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
                `);

                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);

                const images = nodes[0].images;
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

                nodes[0].caption.should.equal('');
            }));

            it('parses a grid gallery into gallery card', editorTest(function () {
                const document = createDocument(html`
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
                `);

                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.equal(1);

                const images = nodes[0].images;
                images.should.be.an.Array().with.lengthOf(2);
                images.should.deepEqual([
                    {
                        fileName: 'test-1.jpg', row: 0, src: 'https://example.com/test-1.jpg', width: 800, height: 600, alt: 'image alt text'
                    },
                    {
                        fileName: 'test-2.jpg', row: 0, src: 'https://example.com/test-2.jpg', width: 600, height: 800, alt: 'image alt text 1'
                    }
                ]);

                nodes[0].caption.should.equal('');
            }));

            it('ignores summary item galleries', editorTest(function () {
                const document = createDocument(html`
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
                `);

                const nodes = $generateNodesFromDOM(editor, document);
                nodes.length.should.not.equal(1);
                nodes[0].getType().should.not.equal('gallery');
            }));
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createGalleryNode();
            node.getTextContent().should.equal('');

            node.caption = 'Test caption';
            node.getTextContent().should.equal('Test caption\n\n');
        }));
    });
});
