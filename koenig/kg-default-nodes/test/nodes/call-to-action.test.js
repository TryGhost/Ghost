const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {dom} = require('../test-utils');
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
            imageHeight: 100
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

            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('data-layout="minimal"');
            html.should.containEql('kg-cta-bg-green');
            html.should.containEql('background-color: #F0F0F0');
            html.should.containEql('Get access now');
            html.should.containEql('http://someblog.com/somepost');
            html.should.containEql('/content/images/2022/11/koenig-lexical.jpg');
            html.should.containEql('This is a new CTA Card.');
            html.should.containEql('Sponsored by'); // because hasSponsorLabel is true
            html.should.containEql('cta-card');
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
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('kg-cta-bg-green');
            html.should.containEql('background-color: #F0F0F0');
            html.should.containEql('Get access now');
            html.should.containEql('http://someblog.com/somepost');
            html.should.containEql('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'); // because hasSponsorLabel is true
            html.should.containEql('/content/images/2022/11/koenig-lexical.jpg');
            html.should.containEql('This is a new CTA Card via email.');
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
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('kg-cta-bg-green');
            html.should.containEql('background-color: #F0F0F0');
            html.should.containEql('Get access now');
            html.should.containEql('http://someblog.com/somepost');
            html.should.containEql('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'); // because hasSponsorLabel is true
            html.should.containEql('/content/images/size/w64h64/2022/11/koenig-lexical.jpg');
            html.should.containEql('This is a new CTA Card via email.');
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
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('/content/images/size/w256h256/2022/11/koenig-lexical.jpg');
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
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('<img src="/content/images/2022/11/koenig-lexical.jpg" alt="CTA Image" class="kg-cta-image" width="200" height="100">');
        }));

        it('parses textValue correctly', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('This is a cool advertisement');
        }));

        it('renders img tag when imageUrl is not null', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.containEql('<img src="http://blog.com/image1.jpg" alt="CTA Image">');
        }));

        it('does not render img tag when imageUrl is null', editorTest(function () {
            dataset.imageUrl = null;
            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            const html = element.outerHTML.toString();
            html.should.not.containEql('<img src="http://blog.com/image1.jpg" alt="CTA Image">');
        }));

        // NOTE: Due to the way the package gets built sinon is unable to redefine
        // utils.visibility, so we directly test the render output rather than spying
        it('should render with web visibility', editorTest(function () {
            exportOptions.target = 'web';
            dataset.visibility = {...utils.visibility.buildDefaultVisibility(), web: {nonMember: false, memberSegment: 'status:free,status:-free'}};

            const callToActionNode = new CallToActionNode(dataset);
            const {element} = callToActionNode.exportDOM(exportOptions);

            element.tagName.should.equal('TEXTAREA');
            element.value.should.match(/<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
        }));

        it('should render with email visibility', editorTest(function () {
            exportOptions.target = 'email';
            dataset.visibility = {...utils.visibility.buildDefaultVisibility(), email: {memberSegment: 'status:free'}};

            const callToActionNode = new CallToActionNode(dataset);
            const {element, type} = callToActionNode.exportDOM(exportOptions);

            type.should.equal('html');
            element.tagName.should.equal('DIV');
            element.dataset.ghSegment.should.equal('status:free');
        }));
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
        // not yet implemented
    });

    describe('getTextContent', function () {
        it('returns textValue', editorTest(function () {
            const callToActionNode = new CallToActionNode(dataset);
            callToActionNode.getTextContent().should.equal('This is a cool advertisement\n\n');
        }));
    });
});
