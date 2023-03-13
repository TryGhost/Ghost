const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {AsideNode, $createAsideNode, $isAsideNode} = require('../../');

const editorNodes = [AsideNode];

describe('AsideNode', function () {
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

        dataset = {};

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isAsideNode', editorTest(function () {
        const asideNode = $createAsideNode();
        $isAsideNode(asideNode).should.be.true;
    }));

    describe('exportDOM', function () {
        it('creates aside element', editorTest(function () {
            const asideNode = $createAsideNode();
            const {element} = asideNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <aside></aside>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses an aside element', editorTest(function () {
            const dom = (new JSDOM(html`
                <aside />
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(AsideNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const asideNode = $createAsideNode(dataset);
            const json = asideNode.exportJSON();

            json.should.deepEqual({
                type: 'aside',
                version: 1,
                children: [],
                direction: null,
                format: '',
                indent: 0
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'aside'
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
                    const [asideNode] = $getRoot().getChildren();
                    asideNode.should.be.instanceof(AsideNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
