import should from 'should';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {dom, createDocument, html as htmlTemplate} from '../test-utils/index.js';
import {CallToActionNode, $createCallToActionNode, $isCallToActionNode, utils, type ExportDOMOutputType} from '../../src/index.js';
const editorNodes = [CallToActionNode];

describe('CallToActionNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: Record<string, unknown>;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => function (done: (err?: unknown) => void) {
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
            showDividers: true,
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
            dom,
            feature: {},
            design: {}
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
            callToActionNode.showDividers.should.equal(dataset.showDividers);
            callToActionNode.buttonText.should.equal(dataset.buttonText);
            callToActionNode.buttonUrl.should.equal(dataset.buttonUrl);
            callToActionNode.buttonColor.should.equal(dataset.buttonColor);
            callToActionNode.buttonTextColor.should.equal(dataset.buttonTextColor);
            callToActionNode.hasSponsorLabel.should.equal(dataset.hasSponsorLabel);
            callToActionNode.sponsorLabel.should.equal(dataset.sponsorLabel);
            callToActionNode.backgroundColor.should.equal(dataset.backgroundColor);
            callToActionNode.imageUrl!.should.equal(dataset.imageUrl);
            (callToActionNode.visibility as Record<string, unknown>).should.deepEqual(utils.visibility.buildDefaultVisibility());
            callToActionNode.imageHeight!.should.equal(dataset.imageHeight);
            callToActionNode.imageWidth!.should.equal(dataset.imageWidth);
            callToActionNode.linkColor.should.equal(dataset.linkColor);
        }));

        it('can be created without a dataset', editorTest(function () {
            const callToActionNode = $createCallToActionNode();

            callToActionNode.getDataset().should.deepEqual({
                layout: 'minimal',
                alignment: 'left',
                textValue: '',
                showButton: true,
                showDividers: true,
                buttonText: 'Learn more',
                buttonUrl: '',
                buttonColor: '#000000',
                buttonTextColor: '#ffffff',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                backgroundColor: 'grey',
                linkColor: 'text',
                imageUrl: '',
                imageWidth: null,
                imageHeight: null,
                visibility: utils.visibility.buildDefaultVisibility()
            });
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

            callToActionNode.showDividers.should.equal(true);
            callToActionNode.showDividers = false;
            callToActionNode.showDividers.should.equal(false);

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

            callToActionNode.imageUrl!.should.equal('');
            callToActionNode.imageUrl = 'http://blog.com/image1.jpg';
            callToActionNode.imageUrl!.should.equal('http://blog.com/image1.jpg');

            should(callToActionNode.imageHeight).be.null();
            callToActionNode.imageHeight = 100;
            callToActionNode.imageHeight!.should.equal(100);

            should(callToActionNode.imageWidth).be.null();
            callToActionNode.imageWidth = 200;
            callToActionNode.imageWidth!.should.equal(200);

            (callToActionNode.visibility as Record<string, unknown>).should.deepEqual(utils.visibility.buildDefaultVisibility());
            callToActionNode.visibility = {
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: ''
                }
            };
            (callToActionNode.visibility as Record<string, unknown>).should.deepEqual({
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
                alignment: 'left',
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
            const clone = CallToActionNode.clone(callToActionNode) as CallToActionNode;
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
        const testRender = (assertFn: (result: {element: HTMLElement; type: ExportDOMOutputType; html: string}) => void) => {
            const callToActionNode = new CallToActionNode(dataset);
            const result = callToActionNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const {type} = result;

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
                showDividers: true,
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
                showDividers: true,
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

        it('uses default buttonText when created with empty buttonText (web)', editorTest(function () {
            dataset.showButton = true;
            dataset.showDividers = true;
            dataset.buttonText = '';

            testRender(({html}) => {
                html.should.containEql('<a href="http://blog.com/post1"');
                html.should.containEql('Learn more');
            });
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
                showDividers: true,
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
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>',
                linkColor: 'text',
                alignment: 'left',
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
                        showDividers: true,
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
        const generateCallToActionNodes = (nodeDataset: Record<string, unknown>) => {
            const callToActionNode = new CallToActionNode(nodeDataset);
            const result = callToActionNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const docuement = createDocument(htmlTemplate`${element.outerHTML.toString()}`);
            const nodes = $generateNodesFromDOM(editor, docuement) as CallToActionNode[];

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
            nodes[0].imageUrl!.should.equal('http://blog.com/image1.jpg');
            nodes[0].imageWidth!.should.equal(200);
            nodes[0].imageHeight!.should.equal(100);
        }));

        it('image width and height falls back to null if not provided', editorTest(function () {
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
