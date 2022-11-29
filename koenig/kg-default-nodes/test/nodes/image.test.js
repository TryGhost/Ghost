const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {ImageNode, $createImageNode, $isImageNode} = require('../../');

const editorNodes = [ImageNode];

describe('ImageNode', function () {
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
            src: '/content/images/2022/11/koenig-lexical.jpg',
            width: 3840,
            height: 2160,
            title: 'This is a title',
            altText: 'This is some alt text',
            caption: 'This is a <b>caption</b>'
        };

        exportOptions = {
            imageOptimization: {
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

    it('matches node with $isImageNode', editorTest(function () {
        const imageNode = $createImageNode(dataset);
        $isImageNode(imageNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const imageNode = $createImageNode(dataset);

            imageNode.getSrc().should.equal('/content/images/2022/11/koenig-lexical.jpg');
            imageNode.getImgWidth().should.equal(3840);
            imageNode.getImgHeight().should.equal(2160);
            imageNode.getTitle().should.equal('This is a title');
            imageNode.getAltText().should.equal('This is some alt text');
            imageNode.getCaption().should.equal('This is a <b>caption</b>');
            imageNode.getCardWidth().should.equal('regular');
        }));

        it('has setters for all properties', editorTest(function () {
            const imageNode = $createImageNode();

            imageNode.getSrc().should.equal('');
            imageNode.setSrc('/content/images/2022/11/koenig-lexical.jpg');
            imageNode.getSrc().should.equal('/content/images/2022/11/koenig-lexical.jpg');

            should(imageNode.getImgWidth()).equal(null);
            imageNode.setImgWidth(3840);
            imageNode.getImgWidth().should.equal(3840);

            should(imageNode.getImgHeight()).equal(null);
            imageNode.setImgHeight(2160);
            imageNode.getImgHeight().should.equal(2160);

            imageNode.getTitle().should.equal('');
            imageNode.setTitle('I am a title');
            imageNode.getTitle().should.equal('I am a title');

            imageNode.getAltText().should.equal('');
            imageNode.setAltText('I am alt text');
            imageNode.getAltText().should.equal('I am alt text');

            imageNode.getCaption().should.equal('');
            imageNode.setCaption('I am a <b>Caption</b>');
            imageNode.getCaption().should.equal('I am a <b>Caption</b>');

            imageNode.getCardWidth().should.equal('regular');
            imageNode.setCardWidth('wide');
            imageNode.getCardWidth().should.equal('wide');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const imageNode = $createImageNode(dataset);
            const imageNodeDataset = imageNode.getDataset();

            imageNodeDataset.should.deepEqual({
                ...dataset,
                cardWidth: 'regular'
            });
        }));
    });

    describe('exportDOM', function () {
        it('creates a full-featured image card', editorTest(function () {
            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-image-card">
                    <img
                        src="/content/images/2022/11/koenig-lexical.jpg"
                        alt="This is some alt text"
                        loading="lazy"
                        title="This is a title"
                        width="3840"
                        height="2160"
                        srcset="/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w" sizes="(min-width: 720px) 720px"
                    >
                    <figcaption>This is a <b>caption</b></figcaption>
                </figure>
            `);
        }));

        it('creates a minimal image card', editorTest(function () {
            const imageNode = $createImageNode({src: '/image.png'});
            const {element} = imageNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <figure class="kg-card kg-image-card">
                    <img src="/image.png" alt="" loading="lazy">
                </figure>
            `);
        }));

        it('renders nothing with a missing src', editorTest(function () {
            const imageNode = $createImageNode();
            const {element} = imageNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));

        it('renders a wide image', editorTest(function () {
            dataset.cardWidth = 'wide';
            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(exportOptions);

            element.classList.contains('kg-width-wide').should.be.true();
        }));

        it('uses resized width and height when there\'s a max width', editorTest(function () {
            dataset.width = 3000;
            dataset.height = 6000;
            // add defaultMaxWidth property to options
            exportOptions.imageOptimization.defaultMaxWidth = 2000;
            exportOptions.canTransformImage = () => true;

            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(exportOptions);
            const output = element.outerHTML;

            output.should.containEql('width="2000"');
            output.should.containEql('height="4000"');
        }));

        it('uses original width and height when transform is not available', editorTest(function () {
            dataset.width = 3000;
            dataset.height = 6000;
            exportOptions.canTransformImage = () => false;

            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(exportOptions);
            const output = element.outerHTML;

            output.should.containEql('width="3000" height="6000"');
        }));

        describe('srcset attribute', function () {
            it('is included when src is an unsplash image', editorTest(function () {
                dataset.width = 3000;
                dataset.height = 6000;
                dataset.src = 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ';

                const imageNode = $createImageNode(dataset);
                const {element} = imageNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                output.should.containEql('https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w');
            }));

            it('is ommitted when target is email', editorTest(function () {
                exportOptions.target = 'email';

                const imageNode = $createImageNode(dataset);
                const {element} = imageNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                output.should.not.containEql('srcset');
            }));

            it('is included for absolute images when siteUrl has trailing slash');
            it('is omitted when no contentImageSizes are passed as options');
            it('is omitted when `srcsets: false` is passed in as an option');
            it('is omitted when canTransformImages is provided and returns false');
            it('is omitted when no width is provided');
            it('is omitted when image is smaller than minimum responsive width');
            it('omits sizes larger than image width and includes origin image width if smaller than largest responsive width');
            it('works correctly with subdirectories');
            it('works correctly with absolute subdirectories');
            it('is included when src is an Unsplash image');
            it('has same size omission behaviour for Unsplash as local files');
        });

        describe('sizes attribute', function () {
            it('is added for standard images', editorTest(function () {
                dataset.width = 3000;
                dataset.height = 6000;

                const imageNode = $createImageNode(dataset);
                const {element} = imageNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                output.should.containEql('sizes="(min-width: 720px) 720px"');
            }));

            it('is added for wide images', editorTest(function () {
                dataset.width = 3000;
                dataset.height = 2000;
                dataset.cardWidth = 'wide';

                const imageNode = $createImageNode(dataset);
                const {element} = imageNode.exportDOM(exportOptions);
                const output = element.outerHTML;

                output.should.containEql('sizes="(min-width: 1200px) 1200px"');
            }));

            it('is omitted when srcset is not added');
            it('is omitted when width is missing');
            it('is included when only height is missing');
            it('is omitted for standard images when width is less than 720');
            it('is omitted for wide images when width is less than 1200');
            it('is omitted for full images');
        });

        describe('email target', function () {
            it('adds width/height and uses resized local image');
            it('adds width/height and uses resized unsplash image');
            it('adds width/height and uses original src when local image can\'t be transformed');
            it('uses original image if size is smaller than "retina" size');
            it('uses original image width/height if image is smaller than 600px wide');
            it('skips width/height and resize if payload is missing dimensions');
            it('resizes Unsplash images even if width/height data is missing');
            it('omits srcset attribute');
        });
    });

    describe('importDOM', function () {
        it('parses an img element', editorTest(function () {
            const dom = (new JSDOM(html`
                <img
                    src="/image.png"
                    alt="Alt text"
                    title="Title text"
                    width="3000"
                    height="2000"
                />
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].getSrc().should.equal('/image.png');
            nodes[0].getAltText().should.equal('Alt text');
            nodes[0].getTitle().should.equal('Title text');
            nodes[0].getImgWidth().should.equal(3000);
            nodes[0].getImgHeight().should.equal(2000);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const imageNode = $createImageNode(dataset);
            const json = imageNode.exportJSON();

            json.should.deepEqual({
                type: 'image',
                src: '/content/images/2022/11/koenig-lexical.jpg',
                width: 3840,
                height: 2160,
                title: 'This is a title',
                altText: 'This is some alt text',
                caption: 'This is a <b>caption</b>',
                cardWidth: 'wide'
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'image',
                        ...dataset,
                        cardWidth: 'wide'
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
                    const [imageNode] = $getRoot().getChildren();

                    imageNode.getSrc().should.equal('/content/images/2022/11/koenig-lexical.jpg');
                    imageNode.getImgWidth().should.equal(3840);
                    imageNode.getImgHeight().should.equal(2160);
                    imageNode.getTitle().should.equal('This is a title');
                    imageNode.getAltText().should.equal('This is some alt text');
                    imageNode.getCaption().should.equal('This is a <b>caption</b>');
                    imageNode.getCardWidth().should.equal('wide');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
