import {createHeadlessEditor} from '@lexical/headless';
import {$isKoenigCard, utils, type ExportDOMOutput} from '../src/index.js';
import type {LexicalEditor} from 'lexical';
import {dom} from './test-utils/index.js';

const defaultVisibility = utils.visibility.buildDefaultVisibility();

function createRenderResult(tagName: 'div' | 'span', content: string) {
    const element = dom.window.document.createElement(tagName);
    element.textContent = content;
    return {
        element,
        type: 'inner' as const
    };
}

function expectHtmlElement(output: ExportDOMOutput) {
    const {element} = output;

    if (!element || !('outerHTML' in element)) {
        throw new Error('Expected exportDOM() to return an HTML element');
    }

    return element;
}

describe('Utils: generateDecoratorNode', function () {
    let editor: LexicalEditor;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

    describe('properties', function () {
        it('widens primitive defaults without a helper type', function () {
            const TypedNode = utils.generateDecoratorNode({
                nodeType: 'typed-properties-test',
                properties: {
                    title: {default: ''},
                    count: {default: 0},
                    enabled: {default: false}
                }
            });
            const typedEditor = createHeadlessEditor({nodes: [TypedNode]});

            typedEditor.update(() => {
                const node = new TypedNode({
                    title: 'Custom title',
                    count: 2,
                    enabled: true
                });
                const title: string = node.title;
                const count: number = node.count;
                const enabled: boolean = node.enabled;

                expect(title).toBe('Custom title');
                expect(count).toBe(2);
                expect(enabled).toBe(true);
                expect($isKoenigCard(node)).toBe(true);
            });
        });

        it('preserves explicitly provided falsy non-string values', function () {
            const NodeWithDefaults = utils.generateDecoratorNode({
                nodeType: 'falsy-properties-test',
                properties: {
                    title: {default: 'Default title'},
                    count: {default: 1},
                    enabled: {default: true}
                }
            });
            const typedEditor = createHeadlessEditor({nodes: [NodeWithDefaults]});

            typedEditor.update(() => {
                const node = new NodeWithDefaults({
                    title: '',
                    count: 0,
                    enabled: false
                });

                expect(node.title).toBe('Default title');
                expect(node.count).toBe(0);
                expect(node.enabled).toBe(false);
            });
        });
    });

    describe('exportDOM', function () {
        const NodeWithRender = utils.generateDecoratorNode({
            nodeType: 'render-test',
            properties: {},
            defaultRenderFn: () => createRenderResult('div', 'default render')
        });
        const $createNodeWithRender = (dataset?: ConstructorParameters<typeof NodeWithRender>[0]) => {
            return new NodeWithRender(dataset);
        };

        beforeAll(function () {
            editor = createHeadlessEditor({nodes: [NodeWithRender]});
        });

        it('uses default renderer when no custom renderer is provided', editorTest(function () {
            const node = $createNodeWithRender();
            const result = node.exportDOM(editor);

            expect(result.type).toBe('inner');
            expect(expectHtmlElement(result).outerHTML).toBe('<div>default render</div>');
        }));

        it('uses versioned default renderer (static version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: {},
                version: 2,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1'),
                    2: () => createRenderResult('div', 'version 2')
                }
            });

            const node = new VersionedNode();
            const result = node.exportDOM(editor);

            expect(result.type).toBe('inner');
            expect(expectHtmlElement(result).outerHTML).toBe('<div>version 2</div>');
        }));

        it('uses versioned default renderer (dataset version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: {version: {default: 1}},
                version: 1,
                defaultRenderFn: {
                    1: node => createRenderResult('div', `version ${node.version}`),
                    2: node => createRenderResult('div', `version ${node.version}`)
                }
            });

            const node = new VersionedNode({version: 2});
            const result = node.exportDOM(editor);

            expect(result.type).toBe('inner');
            expect(expectHtmlElement(result).outerHTML).toBe('<div>version 2</div>');
        }));

        it('throws error when defaultRenderFn is not provided', editorTest(function () {
            const NodeWithoutRender = utils.generateDecoratorNode({
                nodeType: 'no-render-test',
                properties: {}
            });

            const node = new NodeWithoutRender();
            expect(() => node.exportDOM(editor)).toThrow('[generateDecoratorNode] no-render-test: "defaultRenderFn" is required');
        }));

        it('throws error when default versioned renderer is missing for node version', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: {},
                version: 2,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1')
                }
            });

            const node = new VersionedNode();
            expect(() => node.exportDOM(editor)).toThrow('[generateDecoratorNode] versioned-render-test: "defaultRenderFn" for version 2 is required');
        }));

        ['emailCustomizationAlpha', 'emailCustomization'].forEach((feature) => {
            it(`uses custom renderer if passed in (${feature})`, editorTest(function () {
                const node = $createNodeWithRender();
                const customRenderer = () => createRenderResult('span', 'custom render');

                const featureOption: Record<string, boolean> = {};
                featureOption[feature] = true;

                const result = node.exportDOM(editor, {
                    feature: featureOption,
                    nodeRenderers: {
                        'render-test': customRenderer
                    }
                });

                expect(result.type).toBe('inner');
                expect(expectHtmlElement(result).outerHTML).toBe('<span>custom render</span>');
            }));
        });

        it('throws error when custom versioned renderer is missing for node version (emailCustomizationAlpha)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: {version: {default: 1}},
                version: 1,
                defaultRenderFn: {
                    1: () => createRenderResult('div', 'version 1'),
                    2: () => createRenderResult('div', 'version 2')
                }
            });

            const node = new VersionedNode({version: 2});

            expect(() => node.exportDOM(editor, {
                feature: {
                    emailCustomizationAlpha: true
                },
                nodeRenderers: {
                    'versioned-render-test': {
                        1: () => createRenderResult('div', 'version 1')
                    }
                }
            })).toThrow('[generateDecoratorNode] versioned-render-test: options.nodeRenderers[\'versioned-render-test\'] for version 2 is required');
        }));
    });

    describe('hasVisibility', function () {
        const NodeWithVisibility = utils.generateDecoratorNode({
            nodeType: 'visibility-test',
            properties: {},
            hasVisibility: true
        });
        const $createNodeWithVisibility = (dataset?: ConstructorParameters<typeof NodeWithVisibility>[0]) => {
            return new NodeWithVisibility(dataset);
        };

        beforeAll(function () {
            editor = createHeadlessEditor({nodes: [NodeWithVisibility]});
        });

        it('adds visibility property with default', editorTest(function () {
            const node = $createNodeWithVisibility();

            expect(node.visibility).toEqual(defaultVisibility, 'node.visibility');
            expect(node.getDataset().visibility!).toEqual(defaultVisibility, 'node.getDataset().visibility');
            expect(node.exportJSON().visibility!).toEqual(defaultVisibility, 'node.exportJSON().visibility');
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

            expect(node.visibility).toEqual(newVisibility, 'node.visibility');
            expect(node.getDataset().visibility!).toEqual(newVisibility, 'node.getDataset().visibility');
            expect(node.exportJSON().visibility!).toEqual(newVisibility, 'node.exportJSON().visibility');
        }));

        it('ensures default doesn\'t change when nested visibility objects are updated', editorTest(function () {
            const node = $createNodeWithVisibility();

            // NOTE: this wouldn't trigger a Lexical node update, it's just to show
            // that the default can't be accidentally changed by reference
            (node.visibility as {web: {nonMember: boolean}}).web.nonMember = false;

            expect(NodeWithVisibility.getPropertyDefaults().visibility!).toEqual(defaultVisibility);
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
            });

            // old values are kept, new values are added
            expect(node.visibility).toEqual({
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

            expect(node.visibility).toEqual({
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
