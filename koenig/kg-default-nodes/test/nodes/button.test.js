const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');

const {ButtonNode, $createButtonNode, $isButtonNode} = require('../../');

const editorNodes = [ButtonNode];

describe('ButtonNode', function () {
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
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            alignment: 'center'
        };
        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isButtonNode', editorTest(function () {
        const buttonNode = $createButtonNode(dataset);
        $isButtonNode(buttonNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);

            buttonNode.getButtonUrl().should.equal(dataset.buttonUrl);
            buttonNode.getButtonText().should.equal(dataset.buttonText);
            buttonNode.getAlignment().should.equal(dataset.alignment);
        }));

        it('has setters for all properties', editorTest(function () {
            const buttonNode = $createButtonNode();

            buttonNode.getButtonUrl().should.equal('');
            buttonNode.setButtonUrl('http://someblog.com/somepost');
            buttonNode.getButtonUrl().should.equal('http://someblog.com/somepost');

            buttonNode.getButtonText().should.equal('');
            buttonNode.setButtonText('button text');
            buttonNode.getButtonText().should.equal('button text');

            buttonNode.getAlignment().should.equal('center');
            buttonNode.setAlignment('left');
            buttonNode.getAlignment().should.equal('left');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const buttonNodeDataset = buttonNode.getDataset();

            buttonNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('exportDOM', function () {
        it('creates a button card', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const {element} = buttonNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`<div class="kg-card kg-button-card kg-align-center"><a href="http://blog.com/post1" class="kg-btn kg-btn-accent">click me</a></div>`);
        }));

        it('renders for email target', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const options = {
                target: 'email'
            };
            const {element} = buttonNode.exportDOM({...exportOptions, ...options});
            const output = element.outerHTML;

            output.should.not.containEql('kg-card');
            output.should.containEql('<div class="btn btn-accent">');
            output.should.containEql('<table border="0" cellspacing="0" cellpadding="0"');
            output.should.containEql('<td align="center">');
        }));

        it('renders nothing with a missing buttonUrl', editorTest(function () {
            const buttonNode = $createButtonNode();
            const {element} = buttonNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const json = buttonNode.exportJSON();

            json.should.deepEqual({
                type: 'button',
                version: 1,
                buttonUrl: dataset.buttonUrl,
                buttonText: dataset.buttonText,
                alignment: dataset.alignment
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'button',
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
                    const [buttonNode] = $getRoot().getChildren();

                    buttonNode.getButtonUrl().should.equal(dataset.buttonUrl);
                    buttonNode.getButtonText().should.equal(dataset.buttonText);
                    buttonNode.getAlignment().should.equal(dataset.alignment);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const clonedbuttonNode = ButtonNode.clone(buttonNode);
            $isButtonNode(clonedbuttonNode).should.be.true;
            clonedbuttonNode.getButtonUrl().should.equal(dataset.buttonUrl);
        }));
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            ButtonNode.getType().should.equal('button');
        }));

        it('urlTransformMap', editorTest(function () {
            ButtonNode.urlTransformMap.should.deepEqual({
                buttonUrl: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            buttonNode.hasEditMode().should.be.true;
        }));
    });

    describe('importDOM', function () {
        it('parses button card', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-button-card kg-align-center"><a href="http://someblog.com/somepost" class="kg-btn kg-btn-accent">click me</a></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            nodes[0].getButtonUrl().should.equal('http://someblog.com/somepost');
            nodes[0].getButtonText().should.equal('click me');
            nodes[0].getAlignment().should.equal('center');
        }));
    });
});
