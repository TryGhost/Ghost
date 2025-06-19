const {createHeadlessEditor} = require('@lexical/headless');
const {createDocument, dom, html} = require('../test-utils');
const {$getRoot} = require('lexical');
const {SignupNode, $createSignupNode, $isSignupNode, $createPaywallNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [SignupNode];

describe('SignupNode', function () {
    let editor;
    let dataset;
    let exportOptions;

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
            backgroundColor: 'transparent',
            backgroundImageSrc: 'https://example.com/image.jpg',
            backgroundSize: 'cover',
            textColor: '#000000',
            buttonColor: '#000000',
            buttonText: 'Button',
            buttonTextColor: '#ffffff',
            disclaimer: 'Disclaimer',
            header: 'Header',
            subheader: 'Subheader',
            labels: ['label 1', 'label 2'],
            layout: 'regular',
            alignment: 'center',
            successMessage: 'Success!',
            swapped: false
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isSignupNode', editorTest(function () {
        const signupNode = $createSignupNode(dataset);
        $isSignupNode(signupNode).should.be.true();
    }));

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            dataset.backgroundColor = '#000000';
            const signupNode = $createSignupNode(dataset);
            const clonedSignupNode = SignupNode.clone(signupNode);
            const cloneDataset = clonedSignupNode.getDataset();
            cloneDataset.should.deepEqual(dataset);
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            signupNode.hasEditMode().should.be.true();
        }));
    });

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            dataset.backgroundColor = '#000000';
            const signupNode = $createSignupNode(dataset);
            signupNode.alignment.should.equal(dataset.alignment);
            signupNode.backgroundColor.should.equal(dataset.backgroundColor);
            signupNode.backgroundImageSrc.should.equal(dataset.backgroundImageSrc);
            signupNode.backgroundSize.should.equal(dataset.backgroundSize);
            signupNode.textColor.should.equal(dataset.textColor);
            signupNode.buttonColor.should.equal(dataset.buttonColor);
            signupNode.buttonText.should.equal(dataset.buttonText);
            signupNode.buttonTextColor.should.equal(dataset.buttonTextColor);
            signupNode.disclaimer.should.equal(dataset.disclaimer);
            signupNode.header.should.equal(dataset.header);
            signupNode.labels.should.deepEqual(dataset.labels);
            signupNode.layout.should.equal(dataset.layout);
            signupNode.subheader.should.equal(dataset.subheader);
            signupNode.successMessage.should.equal(dataset.successMessage);
            signupNode.swapped.should.equal(dataset.swapped);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createSignupNode(dataset);

            node.alignment = 'left';
            node.backgroundColor = '#f00';
            node.backgroundSize = 'contain';
            node.backgroundImageSrc = 'https://example.com/image2.jpg';
            node.textColor = '#0f0';
            node.buttonColor = '#00f';
            node.buttonTextColor = '#777';
            node.buttonText = 'This is the new button text';
            node.disclaimer = 'This is the new disclaimer';
            node.header = 'This is the new header';
            node.layout = 'compact';
            node.subheader = 'This is the new subheader';
            node.successMessage = 'This is the new success message';
            node.swapped = true;
            // Labels are tested in a separate block below because they are handled differently
        }));

        describe('labels', function () {
            it('can set multiple labels at once', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.setLabels(['new label 1', 'new label 2']);
                node.labels.should.deepEqual(['new label 1', 'new label 2']);
            }));

            it('only accepts an array of strings for setLabels', editorTest(function () {
                const node = $createSignupNode(dataset);
                (() => node.setLabels('label')).should.throwError();
                (() => node.setLabels(['label 1', 2])).should.throwError();
            }));

            it('can add one label to the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.addLabel('new label 3');
                node.labels.should.deepEqual(['label 1', 'label 2', 'new label 3']);
            }));

            it('can remove one label from the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.removeLabel('label 2');
                node.labels.should.deepEqual(['label 1']);
            }));
        });

        it('has getDataset() method', editorTest(function () {
            dataset.backgroundColor = '#000000';
            const signupNode = $createSignupNode(dataset);
            const nodeData = signupNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));
    });

    describe('importDOM', function () {
        const generateSignupNodes = (contents) => {
            const document = createDocument(contents);
            return $generateNodesFromDOM(editor, document);
        };

        it('parses a signup card', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="">
                    <h2>Header</h2>
                    <h3>Subheader</h3>
                    <p>Disclaimer</p>
                    <div class="kg-signup-card-text">
                        <div class="kg-signup-card-button" style="background-color: #000000; color: #ffffff;">
                            <span class="kg-signup-card-button-default">Button</span>
                        </div>
                        <div class="kg-signup-card-success" style="color: #000000;">Success!</div>
                    </div>
                    <input data-members-label value="label 1" />
                    <input data-members-label value="label 2" />
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].header.should.equal('Header');
            nodes[0].subheader.should.equal('Subheader');
            nodes[0].disclaimer.should.equal('Disclaimer');
            nodes[0].buttonText.should.equal('Button');
            nodes[0].successMessage.should.equal('Success!');
            nodes[0].labels.should.deepEqual(['label 1', 'label 2']);
        }));

        it('parses split layout correctly', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" class="kg-layout-split">
                    <h2>Header</h2>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].layout.should.equal('split');
        }));

        it('parses split and swapped correctly', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" class="kg-layout-split kg-swapped">
                    <h2>Header</h2>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].layout.should.equal('split');
            nodes[0].swapped.should.equal(true);
        }));

        it('parses background size contain correctly', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" class="kg-layout-split kg-content-wide">
                    <h2>Header</h2>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].layout.should.equal('split');
            nodes[0].backgroundSize.should.equal('contain');
        }));

        it('parses background size cover correctly', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" class="kg-layout-split">
                    <h2>Header</h2>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].layout.should.equal('split');
            nodes[0].backgroundSize.should.equal('cover');
        }));

        it('parses with empty elements removed', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="">
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].header.should.equal('');
            nodes[0].subheader.should.equal('');
            nodes[0].disclaimer.should.equal('');
        }));

        it('parses without image', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" style="background-color: rgb(255, 0, 0);">
                    <h2>Header</h2>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].backgroundColor.should.equal('#ff0000');
            (nodes[0].backgroundImageSrc === undefined || nodes[0].backgroundImageSrc === '').should.be.true();
        }));

        it('parses with accent button and background', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="" class="kg-style-accent">
                    <h2>Header</h2>
                    <div class="kg-signup-card-button kg-style-accent" style="color: #ffffff;">
                        <span class="kg-signup-card-button-default">Button</span>
                    </div>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].backgroundColor.should.equal('accent');
            nodes[0].buttonColor.should.equal('accent');
            nodes[0].buttonTextColor.should.equal('#ffffff');
        }));

        it('parses with background image', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="">
                    <h2>Header</h2>
                    <img class="kg-signup-card-image" src="https://example.com/image.jpg" />
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].backgroundImageSrc.should.equal('https://example.com/image.jpg');
        }));

        it('parses text alignment', editorTest(function () {
            const nodes = generateSignupNodes(html`
                <div data-lexical-signup-form="">
                    <h2>Header</h2>
                    <div class="kg-signup-card-text kg-align-center">
                        <div class="kg-signup-card-button">
                            <span class="kg-signup-card-button-default">Button</span>
                        </div>
                    </div>
                </div>
            `);
            nodes.length.should.equal(1);
            nodes[0].alignment.should.equal('center');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();

            json.should.deepEqual({
                type: 'signup',
                version: 1,
                alignment: dataset.alignment,
                backgroundColor: dataset.backgroundColor,
                backgroundImageSrc: dataset.backgroundImageSrc,
                backgroundSize: dataset.backgroundSize,
                textColor: dataset.textColor,
                buttonColor: dataset.buttonColor,
                buttonText: dataset.buttonText,
                buttonTextColor: dataset.buttonTextColor,
                disclaimer: dataset.disclaimer,
                header: dataset.header,
                labels: dataset.labels,
                layout: dataset.layout,
                subheader: dataset.subheader,
                successMessage: dataset.successMessage,
                swapped: dataset.swapped
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'signup',
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
                    const [signupNode] = $getRoot().getChildren();

                    $isSignupNode(signupNode).should.be.true();
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createPaywallNode();

            // signup nodes don't have text content
            node.getTextContent().should.equal('');
        }));
    });
});
