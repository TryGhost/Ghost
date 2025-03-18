const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {$getRoot} = require('lexical');
const {dom, createDocument, html: htmlTemplate} = require('../test-utils');
const {CallToActionNode, $isCallToActionNode, utils} = require('../../');
const editorNodes = [CallToActionNode];

describe('CallToActionNode', function () {
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
            layout: 'minimal',
            textValue: 'This is a cool advertisement',
            sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
            showButton: true,
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            buttonColor: 'none',
            buttonTextColor: 'none',
            hasSponsorLabel: true,
            backgroundColor: 'none',
            imageUrl: 'http://blog.com/image1.jpg',
            imageWidth: 200,
            imageHeight: 100,
            linkColor: 'text'
        };
        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isCallToActionNode', editorTest(function () {
        const callToActionNode = new CallToActionNode(dataset);
        $isCallToActionNode(callToActionNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);

            callToActionNode.layout.should.equal(dataset.layout);
            callToActionNode.textValue.should.equal(dataset.textValue);
            callToActionNode.showButton.should.equal(dataset.showButton);
            callToActionNode.buttonText.should.equal(dataset.buttonText);
            callToActionNode.buttonUrl.should.equal(dataset.buttonUrl);
            callToActionNode.buttonColor.should.equal(dataset.buttonColor);
            callToActionNode.buttonTextColor.should.equal(dataset.buttonTextColor);
            callToActionNode.hasSponsorLabel.should.equal(dataset.hasSponsorLabel);
            callToActionNode.sponsorLabel.should.equal(dataset.sponsorLabel);
            callToActionNode.backgroundColor.should.equal(dataset.backgroundColor);
            callToActionNode.imageUrl.should.equal(dataset.imageUrl);
            callToActionNode.visibility.should.deepEqual(utils.visibility.buildDefaultVisibility());
            callToActionNode.imageHeight.should.equal(dataset.imageHeight);
            callToActionNode.imageWidth.should.equal(dataset.imageWidth);
            callToActionNode.linkColor.should.equal(dataset.linkColor);
        }));

        it('has setters for all properties', editorTest(function () {
            const callToActionNode = new CallToActionNode();
            callToActionNode.layout.should.equal('minimal');
            callToActionNode.layout = 'compact';
            callToActionNode.layout.should.equal('compact');

            callToActionNode.textValue.should.equal('');
            callToActionNode.textValue = 'This is a cool advertisement';
            callToActionNode.textValue.should.equal('This is a cool advertisement');

            callToActionNode.showButton.should.equal(true);
            callToActionNode.showButton = false;
            callToActionNode.showButton.should.equal(false);

            callToActionNode.buttonText.should.equal('Learn more');
            callToActionNode.buttonText = 'click me';
            callToActionNode.buttonText.should.equal('click me');

            callToActionNode.buttonUrl.should.equal('');
            callToActionNode.buttonUrl = 'http://blog.com/post1';
            callToActionNode.buttonUrl.should.equal('http://blog.com/post1');

            callToActionNode.sponsorLabel.should.equal('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>');
            callToActionNode.sponsorLabel = 'This post is brought to you by our sponsors';
            callToActionNode.sponsorLabel.should.equal('This post is brought to you by our sponsors');

            callToActionNode.buttonColor.should.equal('#000000');
            callToActionNode.buttonColor = '#ffffff';
            callToActionNode.buttonColor.should.equal('#ffffff');

            callToActionNode.buttonTextColor.should.equal('#ffffff');
            callToActionNode.buttonTextColor = 'black';
            callToActionNode.buttonTextColor.should.equal('black');

            callToActionNode.hasSponsorLabel.should.equal(true);
            callToActionNode.hasSponsorLabel = false;
            callToActionNode.hasSponsorLabel.should.equal(false);

            callToActionNode.backgroundColor.should.equal('grey');
            callToActionNode.backgroundColor = 'red';
            callToActionNode.backgroundColor.should.equal('red');

            callToActionNode.imageUrl.should.equal('');
            callToActionNode.imageUrl = 'http://blog.com/image1.jpg';
            callToActionNode.imageUrl.should.equal('http://blog.com/image1.jpg');

            should(callToActionNode.imageHeight).be.null();
            callToActionNode.imageHeight = 100;
            callToActionNode.imageHeight.should.equal(100);

            should(callToActionNode.imageWidth).be.null();
            callToActionNode.imageWidth = 200;
            callToActionNode.imageWidth.should.equal(200);

            callToActionNode.visibility.should.deepEqual(utils.visibility.buildDefaultVisibility());
            callToActionNode.visibility = {
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: ''
                }
            };
            callToActionNode.visibility.should.deepEqual({
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: ''
                }
            });

            callToActionNode.linkColor.should.equal('text');
            callToActionNode.linkColor = 'accent';
            callToActionNode.linkColor.should.equal('accent');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const callToActionNodeDataset = callToActionNode.getDataset();

            callToActionNodeDataset.should.deepEqual({
                ...dataset,
                ...{visibility: utils.visibility.buildDefaultVisibility()}
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            CallToActionNode.getType().should.equal('call-to-action');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const callToActionNodeDataset = callToActionNode.getDataset();
            const clone = CallToActionNode.clone(callToActionNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...callToActionNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        // not yet implemented
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            callToActionNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportDOM', function () {
        const testRender = (assertFn) => {
            const callToActionNode = new CallToActionNode(dataset);
            const {element, type} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            assertFn({element, type, html});
        };

        it('has all data attributes in Web', editorTest(function () {
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>Sponsored by</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
            };

            testRender(({html}) => {
                html.should.containEql('data-layout="minimal"');
                html.should.containEql('kg-cta-bg-green');
                html.should.containEql('background-color: #F0F0F0');
                html.should.containEql('Get access now');
                html.should.containEql('http://someblog.com/somepost');
                html.should.containEql('/content/images/2022/11/koenig-lexical.jpg');
                html.should.containEql('This is a new CTA Card.');
                html.should.containEql('Sponsored by'); // because hasSponsorLabel is true
                html.should.containEql('cta-card');
            });
        }));

        it('has all data attributes in Email', editorTest(function () {
            exportOptions.target = 'email';
            exportOptions.canTransformImage = () => true;
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'immersive',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            };

            testRender(({html}) => {
                html.should.containEql('kg-cta-bg-green');
                html.should.containEql('background-color: #F0F0F0');
                html.should.containEql('Get access now');
                html.should.containEql('http://someblog.com/somepost');
                html.should.containEql('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'); // because hasSponsorLabel is true
                html.should.containEql('/content/images/2022/11/koenig-lexical.jpg');
                html.should.containEql('This is a new CTA Card via email.');
            });
        }));

        it('uses cropped image when layout is minimal', editorTest(function () {
            exportOptions.target = 'email';
            exportOptions.canTransformImage = () => true;
            exportOptions.imageOptimization = {
                internalImageSizes: {
                    'email-cta-minimal-image': {width: 64, height: 64}
                }
            };
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            };

            testRender(({html}) => {
                html.should.containEql('kg-cta-bg-green');
                html.should.containEql('background-color: #F0F0F0');
                html.should.containEql('Get access now');
                html.should.containEql('http://someblog.com/somepost');
                html.should.containEql('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'); // because hasSponsorLabel is true
                html.should.containEql('/content/images/size/w64h64/2022/11/koenig-lexical.jpg');
                html.should.containEql('This is a new CTA Card via email.');
            });
        }));

        it('cropped image defaults to 256 if no exportOptions.imageOptimizations are provided', editorTest(function () {
            exportOptions.target = 'email';
            exportOptions.canTransformImage = () => true;
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            };

            testRender(({html}) => {
                html.should.containEql('/content/images/size/w256h256/2022/11/koenig-lexical.jpg');
            });
        }));

        it('renders email with img width and height when immersive', editorTest(function () {
            exportOptions.target = 'email';
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'immersive',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>',
                imageWidth: 200,
                imageHeight: 100
            };

            testRender(({html}) => {
                html.should.containEql('<img src="/content/images/2022/11/koenig-lexical.jpg" alt="CTA Image" class="kg-cta-image" width="200" height="100">');
            });
        }));

        it('parses textValue correctly', editorTest(function () {
            testRender(({html}) => {
                html.should.containEql('This is a cool advertisement');
            });
        }));

        it('renders img tag when imageUrl is not null', editorTest(function () {
            testRender(({html}) => {
                html.should.containEql('<img src="http://blog.com/image1.jpg" alt="CTA Image" data-image-dimensions="200x100">');
            });
        }));

        it('does not render img tag when imageUrl is null', editorTest(function () {
            dataset.imageUrl = null;

            testRender(({html}) => {
                html.should.not.containEql('<img src="http://blog.com/image1.jpg" alt="CTA Image">');
            });
        }));

        // NOTE: Due to the way the package gets built sinon is unable to redefine
        // utils.visibility, so we directly test the render output rather than spying
        it('should render with web visibility', editorTest(function () {
            exportOptions.target = 'web';
            dataset.visibility = {...utils.visibility.buildDefaultVisibility(), web: {nonMember: false, memberSegment: 'status:free,status:-free'}};

            testRender(({element}) => {
                element.tagName.should.equal('TEXTAREA');
                element.value.should.match(/<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
            });
        }));

        it('should render with email visibility', editorTest(function () {
            exportOptions.target = 'email';
            dataset.visibility = {...utils.visibility.buildDefaultVisibility(), email: {memberSegment: 'status:free'}};

            testRender(({element, type}) => {
                type.should.equal('html');
                element.tagName.should.equal('DIV');
                element.dataset.ghSegment.should.equal('status:free');
            });
        }));

        it('uses default buttonText when created with empty buttonText (web)', editorTest(function () {
            dataset.showButton = true;
            dataset.buttonText = '';

            testRender(({html}) => {
                html.should.containEql('<a href="http://blog.com/post1"');
                html.should.containEql('Learn more');
            });
        }));

        it('removes <p> first child tag from sponsorLabel', editorTest(function () {
            testRender(({element}) => {
                const sponsorLabel = element.querySelector('.kg-cta-sponsor-label');
                sponsorLabel.should.exist;
                sponsorLabel.firstElementChild.tagName.should.equal('SPAN');
                sponsorLabel.firstElementChild.outerHTML.should.equal('<span style="white-space: pre-wrap;">SPONSORED</span>');
            });
        }));

        function testButtonSkipOnMissingData(target, layout, {missing = []} = {}) {
            return editorTest(function () {
                dataset.layout = layout;
                dataset.showButton = true;
                dataset.buttonUrl = 'http://blog.com/post1';
                dataset.buttonText = 'Click me';
                exportOptions.target = target;

                // NOTE: does not use testRender() because we need to set button text later to avoid node defaults
                const callToActionNode = new CallToActionNode(dataset);

                // clear out the missing data
                missing.forEach((prop) => {
                    callToActionNode[prop] = '';
                });

                const {element} = callToActionNode.exportDOM(exportOptions);
                const html = element.outerHTML.toString();

                html.should.not.containEql('<a href="http://blog.com/post1"');
                html.should.not.containEql('Click me');
            });
        }

        it('skips button when buttonUrl is empty (web, minimal)', testButtonSkipOnMissingData('web', 'minimal', {missing: ['buttonUrl']}));
        it('skips button when buttonText is empty (web, minimal)', testButtonSkipOnMissingData('web', 'minimal', {missing: ['buttonText']}));
        it('skips button when buttonUrl is empty (email, minimal)', testButtonSkipOnMissingData('email', 'minimal', {missing: ['buttonUrl']}));
        it('skips button when buttonUrl is empty (email, immersive)', testButtonSkipOnMissingData('email', 'immersive', {missing: ['buttonUrl']}));
        it('skips button when buttonText is empty (email, minimal)', testButtonSkipOnMissingData('email', 'minimal', {missing: ['buttonText']}));
        it('skips button when buttonText is empty (email, immersive)', testButtonSkipOnMissingData('email', 'immersive', {missing: ['buttonText']}));

        function testImageLink(target, layout) {
            return editorTest(function () {
                exportOptions.target = target;
                dataset.layout = layout;
                dataset.showButton = true;
                dataset.buttonUrl = 'http://blog.com/post1';

                testRender(({html}) => {
                    html.should.containEql('<a href="http://blog.com/post1"><img');
                });
            });
        }

        it('adds link to image when button is present with url (web)', testImageLink('web', 'minimal'));
        it('adds link to image when button is present with url (email, minimal)', testImageLink('email', 'minimal'));
        it('adds link to image when button is present with url (email, immersive)', testImageLink('email', 'immersive'));

        function testSkippedImageLink(target, layout) {
            return editorTest(function () {
                exportOptions.target = target;
                dataset.layout = layout;
                dataset.showButton = false;
                dataset.buttonUrl = 'http://blog.com/post1';

                testRender(({html}) => {
                    html.should.not.containEql('<a href="http://blog.com/post1"><img');
                });
            });
        }

        it('skips link to image when button is not shown (web)', testSkippedImageLink('web', 'minimal'));
        it('skips link to image when button is not shown (email, minimal)', testSkippedImageLink('email', 'minimal'));
        it('skips link to image when button is not shown (email, immersive)', testSkippedImageLink('email', 'immersive'));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset = {
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                imageWidth: 200,
                imageHeight: 100,
                layout: 'minimal',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
            };
            const callToActionNode = new CallToActionNode(dataset);
            const json = callToActionNode.exportJSON();

            json.should.deepEqual({
                type: 'call-to-action',
                version: 1,
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                imageWidth: 200,
                imageHeight: 100,
                layout: 'minimal',
                showButton: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>',
                linkColor: 'text',
                visibility: {
                    web: {
                        nonMember: true,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedData = JSON.stringify({
                root: {
                    children: [{
                        type: 'call-to-action',
                        backgroundColor: 'green',
                        buttonColor: '#F0F0F0',
                        buttonText: 'Get access now',
                        buttonTextColor: '#000000',
                        buttonUrl: 'http://someblog.com/somepost',
                        hasSponsorLabel: true,
                        sponsorLabel: '<p>This post is brought to you by our sponsors</p>',
                        imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                        layout: 'minimal',
                        showButton: true,
                        textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedData);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [callToActionNode] = $getRoot().getChildren();
                    $isCallToActionNode(callToActionNode).should.be.true();

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            CallToActionNode.getType().should.equal('call-to-action');
        }));

        it('urlTransformMap', editorTest(function () {
            // not yet implemented
        }));
    });

    describe('importDom', function () {
        const generateCallToActionNodes = (nodeDataset) => {
            const callToActionNode = new CallToActionNode(nodeDataset);
            const {element} = callToActionNode.exportDOM(exportOptions);
            const docuement = createDocument(htmlTemplate`${element.outerHTML.toString()}`);
            const nodes = $generateNodesFromDOM(editor, docuement);

            return nodes;
        };
        it('parses the cta card layout', editorTest(function () {
            dataset.layout = 'immersive';
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].layout.should.equal('immersive');
        }));

        it('parses text value', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].textValue.should.equal('This is a cool advertisement');
        }));

        it('checks if button is visible', editorTest(function (){
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].showButton.should.equal(true);
        }));

        it('checks if button is not visible', editorTest(function (){
            dataset.showButton = false;
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].showButton.should.equal(false);
        }));

        it('can get button text', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].buttonText.should.equal('click me');
        }));

        it('can get button URL', editorTest(function (){
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].buttonUrl.should.equal('http://blog.com/post1');
        }));

        it('can get button colours', editorTest(function () {
            dataset.buttonColor = '#123456';
            dataset.buttonTextColor = '#654321';
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].buttonColor.should.equal('#123456');
            nodes[0].buttonTextColor.should.equal('#654321');
        }));

        it('can check if it has a sponsorLabel', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].hasSponsorLabel.should.equal(true);
        }));

        it('returns false if it does not have a sponsorLabel', editorTest(function () {
            dataset.hasSponsorLabel = false;
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].hasSponsorLabel.should.equal(false);
        }));

        it('can get sponsorLabel', editorTest(function () {
            dataset.sponsorLabel = '<p><span style="white-space: pre-wrap">SPONSORED BY GHOST</span></p>';
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].sponsorLabel.should.equal('<p><span style="white-space: pre-wrap">SPONSORED BY GHOST</span></p>');
        }));

        it('can get background color', editorTest(function () {
            dataset.backgroundColor = 'red';
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].backgroundColor.should.equal('red');
        }));

        it('can get image data', editorTest(function () {
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            nodes[0].imageUrl.should.equal('http://blog.com/image1.jpg');
            nodes[0].imageWidth.should.equal(200);
            nodes[0].imageHeight.should.equal(100);
        }));

        it('image width and height falls back to nulll if not provided', editorTest(function () {
            dataset.imageWidth = null;
            dataset.imageHeight = null;
            const nodes = generateCallToActionNodes(dataset);
            nodes.length.should.equal(1);
            should(nodes[0].imageWidth).be.null();
            should(nodes[0].imageHeight).be.null();
        }));
    });

    describe('getTextContent', function () {
        it('returns textValue', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            callToActionNode.getTextContent().should.equal('This is a cool advertisement\n\n');
        }));
    });
});
