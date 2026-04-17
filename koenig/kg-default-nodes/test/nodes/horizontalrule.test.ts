import {createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [HorizontalRuleNode];

describe('HorizontalNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: {dom: typeof dom};

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

        dataset = {};

        exportOptions = {
            dom
        };
    });

    it('matches node with $isHorizontalRuleNode', editorTest(function () {
        const hrNode = $createHorizontalRuleNode();
        $isHorizontalRuleNode(hrNode).should.be.true();
    }));

    describe('exportDOM', function () {
        it('creates hr element', editorTest(function () {
            const hrNode = $createHorizontalRuleNode();
            const {element} = hrNode.exportDOM(exportOptions);

            (element as HTMLElement).outerHTML.should.prettifyTo(html`
                <hr />
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses an hr element', editorTest(function () {
            const document = createDocument(html`
                <hr />
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HorizontalRuleNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const asideNode = $createHorizontalRuleNode();
            const json = asideNode.exportJSON();

            json.should.deepEqual({
                type: 'horizontalrule',
                version: 1
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'horizontalrule'
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [hrNode] = $getRoot().getChildren();
                    hrNode.should.be.instanceof(HorizontalRuleNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns plaintext representation', editorTest(function () {
            const node = $createHorizontalRuleNode();
            node.getTextContent().should.equal('---\n\n');
        }));
    });

    describe('getIsVisibilityActive', function () {
        it('returns false (has no visibility property)', editorTest(function () {
            const node = $createHorizontalRuleNode();
            node.getIsVisibilityActive().should.be.false();
        }));
    });
});
