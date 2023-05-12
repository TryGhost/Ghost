const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {html} = require('../utils');
const {ToggleNode, $createToggleNode, $isToggleNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [ToggleNode];

describe('ToggleNode', function () {
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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });

        dataset = {
            heading: 'Toggle Heading',
            content: 'Collapsible content'
        };

        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isToggleNode', editorTest(function () {
        const toggleNode = $createToggleNode(dataset);
        $isToggleNode(toggleNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);

            toggleNode.getHeading().should.equal(dataset.heading);
            toggleNode.getContent().should.equal(dataset.content);
        }));

        it('has setters for all properties', editorTest(function () {
            const toggleNode = $createToggleNode();

            toggleNode.getHeading().should.equal('');
            toggleNode.setHeading('Heading');
            toggleNode.getHeading().should.equal('Heading');

            toggleNode.getContent().should.equal('');
            toggleNode.setContent('Content');
            toggleNode.getContent().should.equal('Content');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const toggleNodeDataset = toggleNode.getDataset();

            toggleNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();

            json.should.deepEqual({
                type: 'toggle',
                version: 1,
                heading: dataset.heading,
                content: dataset.content
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'toggle',
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
                    const [toggleNode] = $getRoot().getChildren();

                    toggleNode.getHeading().should.equal(dataset.heading);
                    toggleNode.getContent().should.equal(dataset.content);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('exportDOM', function () {
        it('renders', editorTest(function () {
            const payload = {
                heading: 'Heading',
                content: 'Content'
            };
            const toggleNode = $createToggleNode(payload);
            const {element} = toggleNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
            <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">Heading</h4>
                    <button class="kg-toggle-card-icon">
                        <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                        </svg>
                    </button>
                </div>
                <div class="kg-toggle-content">Content</div>
            </div>
            `);
        }));

        it('renders for email target', editorTest(function () {
            const payload = {
                heading: 'Heading',
                content: 'Content'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const toggleNode = $createToggleNode(payload);
            const {element} = toggleNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.prettifyTo(html`
                <div style="background: transparent;
                border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;">
                    <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">Heading</h4>
                    <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">Content</div>
                </div>
            `);
        }));

        it('renders heading', editorTest(function () {
            const payload = {
                heading: 'Heading',
                content: 'Content'
            };

            const toggleNode = $createToggleNode(payload);
            const {element} = toggleNode.exportDOM(exportOptions);
            element.outerHTML.should.containEql('<h4 class="kg-toggle-heading-text">Heading</h4>');
        }));

        it('renders content', editorTest(function () {
            const payload = {
                heading: 'Heading',
                content: 'Content'
            };

            const toggleNode = $createToggleNode(payload);
            const {element} = toggleNode.exportDOM(exportOptions);
            element.outerHTML.should.containEql('<div class="kg-toggle-content">Content</div>');
        }));
    });

    describe('importDOM', function () {
        it('parses toggle card', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-toggle-card" data-kg-toggle-state="close"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text">Heading</h4><button class="kg-toggle-card-icon"><svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path></svg></button></div><div class="kg-toggle-content">Content</div></div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            nodes[0].getHeading().should.equal('Heading');
            nodes[0].getContent().should.equal('Content');
        }));
    });
});