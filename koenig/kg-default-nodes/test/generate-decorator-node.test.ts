import 'should';
import {createHeadlessEditor} from '@lexical/headless';
import {utils, type ExportDOMOptions, type ExportDOMOutput} from '../src/index.js';
import type {LexicalEditor} from 'lexical';
import {dom} from './test-utils/index.js';

const defaultVisibility = utils.visibility.buildDefaultVisibility();

type GeneratedNodeClass = ReturnType<typeof utils.generateDecoratorNode>;

interface GeneratedNodeInstance {
    exportDOM(options?: ExportDOMOptions): ExportDOMOutput;
    exportJSON(): Record<string, unknown>;
    getDataset(): Record<string, unknown>;
    visibility: Record<string, unknown>;
    [key: string]: unknown;
}

function createRenderResult(tagName: 'div' | 'span', content: string) {
    const element = dom.window.document.createElement(tagName);
    element.textContent = content;
    return {
        element,
        type: 'inner' as const
    };
}

describe('Utils: generateDecoratorNode', function () {
    let editor: LexicalEditor;

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

    describe('exportDOM', function () {
        let NodeWithRender: GeneratedNodeClass;
        let $createNodeWithRender: (dataset?: Record<string, unknown>) => GeneratedNodeInstance;

        before(function () {
            NodeWithRender = utils.generateDecoratorNode({
                nodeType: 'render-test',
                properties: [],
                defaultRenderFn: () => createRenderResult('div', 'default render')
            });

            $createNodeWithRender = (dataset?: Record<string, unknown>) => {
                return new NodeWithRender(dataset) as unknown as GeneratedNodeInstance;
            };

            editor = createHeadlessEditor({nodes: [NodeWithRender]});
        });

        it('uses default renderer when no custom renderer is provided', editorTest(function () {
            const node = $createNodeWithRender();
            const result = node.exportDOM();

            result.type.should.equal('inner');
            result.element?.outerHTML.should.equal('<div>default render</div>');
        }));

        it('uses versioned default renderer (static version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [],
                version: 2,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1'),
                    2: () => createRenderResult('div', 'version 2')
                }
            });

            const node = new VersionedNode() as unknown as GeneratedNodeInstance;
            const result = node.exportDOM();

            result.type.should.equal('inner');
            result.element?.outerHTML.should.equal('<div>version 2</div>');
        }));

        it('uses versioned default renderer (dataset version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [{name: 'version', default: 1}],
                version: 1,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1'),
                    2: () => createRenderResult('div', 'version 2')
                }
            });

            const node = new VersionedNode({version: 2}) as unknown as GeneratedNodeInstance;
            const result = node.exportDOM();

            result.type.should.equal('inner');
            result.element?.outerHTML.should.equal('<div>version 2</div>');
        }));

        it('throws error when defaultRenderFn is not provided', editorTest(function () {
            const NodeWithoutRender = utils.generateDecoratorNode({
                nodeType: 'no-render-test',
                properties: []
            });

            const node = new NodeWithoutRender() as unknown as GeneratedNodeInstance;
            (() => node.exportDOM()).should.throw('[generateDecoratorNode] no-render-test: "defaultRenderFn" is required');
        }));

        it('throws error when default versioned renderer is missing for node version', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [],
                version: 2,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1')
                }
            });

            const node = new VersionedNode() as unknown as GeneratedNodeInstance;
            (() => node.exportDOM()).should.throw('[generateDecoratorNode] versioned-render-test: "defaultRenderFn" for version 2 is required');
        }));

        ['emailCustomizationAlpha', 'emailCustomization'].forEach((feature) => {
            it(`uses custom renderer if passed in (${feature})`, editorTest(function () {
                const node = $createNodeWithRender();
                const customRenderer = () => createRenderResult('span', 'custom render');

                const featureOption: Record<string, boolean> = {};
                featureOption[feature] = true;

                const result = node.exportDOM({
                    feature: featureOption,
                    nodeRenderers: {
                        'render-test': customRenderer
                    }
                });

                result.type.should.equal('inner');
                result.element?.outerHTML.should.equal('<span>custom render</span>');
            }));
        });

        it('throws error when custom versioned renderer is missing for node version (emailCustomizationAlpha)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [{name: 'version', default: 1}],
                version: 1,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1'),
                    2: () => createRenderResult('div', 'version 2')
                }
            });

            const node = new VersionedNode({version: 2}) as unknown as GeneratedNodeInstance;

            (() => node.exportDOM({
                feature: {
                    emailCustomizationAlpha: true
                },
                nodeRenderers: {
                    'versioned-render-test': {
                        1: () => createRenderResult('div', 'version 1')
                    }
                }
            })).should.throw('[generateDecoratorNode] versioned-render-test: options.nodeRenderers[\'versioned-render-test\'] for version 2 is required');
        }));
    });

    describe('hasVisibility', function () {
        let NodeWithVisibility: GeneratedNodeClass;
        let $createNodeWithVisibility: (dataset?: Record<string, unknown>) => GeneratedNodeInstance;

        before(function () {
            NodeWithVisibility = utils.generateDecoratorNode({
                nodeType: 'visibility-test',
                properties: [],
                hasVisibility: true
            });

            $createNodeWithVisibility = (dataset?: Record<string, unknown>) => {
                return new NodeWithVisibility(dataset) as unknown as GeneratedNodeInstance;
            };

            editor = createHeadlessEditor({nodes: [NodeWithVisibility]});
        });

        it('adds visibility property with default', editorTest(function () {
            const node = $createNodeWithVisibility();

            node.visibility.should.deepEqual(defaultVisibility, 'node.visibility');
            node.getDataset().visibility!.should.deepEqual(defaultVisibility, 'node.getDataset().visibility');
            node.exportJSON().visibility!.should.deepEqual(defaultVisibility, 'node.exportJSON().visibility');
        }));

        it('can update visibility', editorTest(function () {
            const node = $createNodeWithVisibility();

            const newVisibility = {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            };

            node.visibility = newVisibility;

            node.visibility.should.deepEqual(newVisibility, 'node.visibility');
            node.getDataset().visibility!.should.deepEqual(newVisibility, 'node.getDataset().visibility');
            node.exportJSON().visibility!.should.deepEqual(newVisibility, 'node.exportJSON().visibility');
        }));

        it('ensures default doesn\'t change when nested visibility objects are updated', editorTest(function () {
            const node = $createNodeWithVisibility();

            // NOTE: this wouldn't trigger a Lexical node update, it's just to show
            // that the default can't be accidentally changed by reference
            (node.visibility as {web: {nonMember: boolean}}).web.nonMember = false;

            NodeWithVisibility.getPropertyDefaults().visibility!.should.deepEqual(defaultVisibility);
        }));

        // During the early visibility beta period we had a different format for visibility
        // when importing we convert to the new format so it keeps working with later UI iterations
        it('migrates old visibility format when importing JSON', editorTest(function () {
            const node = NodeWithVisibility.importJSON({
                visibility: {
                    showOnWeb: false,
                    showOnEmail: true,
                    segment: 'status:free'
                }
            }) as unknown as GeneratedNodeInstance;

            // old values are kept, new values are added
            node.visibility.should.deepEqual({
                showOnWeb: false,
                showOnEmail: true,
                segment: 'status:free',
                web: {
                    nonMember: false,
                    memberSegment: ''
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        }));

        it('can set visibility via constructor', editorTest(function () {
            const node = $createNodeWithVisibility({
                visibility: {
                    web: {
                        nonMember: false,
                        memberSegment: 'status:free'
                    },
                    email: {
                        memberSegment: 'status:free'
                    }
                }
            });

            node.visibility.should.deepEqual({
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        }));
    });
});
