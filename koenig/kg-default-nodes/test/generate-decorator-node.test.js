const {createHeadlessEditor} = require('@lexical/headless');
const {utils} = require('../');

const defaultVisibility = utils.visibility.buildDefaultVisibility();

describe('Utils: generateDecoratorNode', function () {
    let editor;

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

    describe('exportDOM', function () {
        let NodeWithRender;
        let $createNodeWithRender;

        before(function () {
            NodeWithRender = utils.generateDecoratorNode({
                nodeType: 'render-test',
                properties: [],
                defaultRenderFn: () => ({
                    element: 'div',
                    type: 'inner',
                    content: 'default render'
                })
            });

            $createNodeWithRender = (dataset) => {
                return new NodeWithRender(dataset);
            };

            editor = createHeadlessEditor({nodes: [NodeWithRender]});
        });

        it('uses default renderer when no custom renderer is provided', editorTest(function () {
            const node = $createNodeWithRender();
            const result = node.exportDOM();

            result.should.deepEqual({
                element: 'div',
                type: 'inner',
                content: 'default render'
            });
        }));

        it('uses versioned default renderer (static version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [],
                version: 2,
                defaultRenderFn: {
                    1: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 1'
                    }),
                    2: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 2'
                    })
                }
            });

            const node = new VersionedNode();
            const result = node.exportDOM();

            result.should.deepEqual({
                element: 'div',
                type: 'inner',
                content: 'version 2'
            });
        }));

        it('uses versioned default renderer (dataset version)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [{name: 'version', default: 1}],
                version: 1,
                defaultRenderFn: {
                    1: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 1'
                    }),
                    2: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 2'
                    })
                }
            });

            const node = new VersionedNode({version: 2});
            const result = node.exportDOM();

            result.should.deepEqual({
                element: 'div',
                type: 'inner',
                content: 'version 2'
            });
        }));

        it('throws error when defaultRenderFn is not provided', editorTest(function () {
            const NodeWithoutRender = utils.generateDecoratorNode({
                nodeType: 'no-render-test',
                properties: []
            });

            const node = new NodeWithoutRender();
            (() => node.exportDOM()).should.throw('[generateDecoratorNode] no-render-test: "defaultRenderFn" is required');
        }));

        it('throws error when default versioned renderer is missing for node version', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [],
                version: 2,
                defaultRenderFn: {
                    1: () => ({})
                }
            });

            const node = new VersionedNode();
            (() => node.exportDOM()).should.throw('[generateDecoratorNode] versioned-render-test: "defaultRenderFn" for version 2 is required');
        }));

        // eslint-disable-next-line ghost/mocha/no-setup-in-describe
        ['emailCustomizationAlpha', 'emailCustomization'].forEach((feature) => {
            it(`uses custom renderer if passed in (${feature})`, editorTest(function () {
                const node = $createNodeWithRender();
                const customRenderer = () => ({
                    element: 'span',
                    type: 'inner',
                    content: 'custom render'
                });

                const featureOption = {};
                featureOption[feature] = true;

                const result = node.exportDOM({
                    feature: featureOption,
                    nodeRenderers: {
                        'render-test': customRenderer
                    }
                });

                result.should.deepEqual({
                    element: 'span',
                    type: 'inner',
                    content: 'custom render'
                });
            }));
        });

        it('throws error when custom versioned renderer is missing for node version (emailCustomizationAlpha)', editorTest(function () {
            const VersionedNode = utils.generateDecoratorNode({
                nodeType: 'versioned-render-test',
                properties: [{name: 'version', default: 1}],
                version: 1,
                defaultRenderFn: {
                    1: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 1'
                    }),
                    2: () => ({
                        element: 'div',
                        type: 'inner',
                        content: 'version 2'
                    })
                }
            });

            const node = new VersionedNode({version: 2});

            (() => node.exportDOM({
                feature: {
                    emailCustomizationAlpha: true
                },
                nodeRenderers: {
                    'versioned-render-test': {
                        1: () => ({})
                    }
                }
            })).should.throw('[generateDecoratorNode] versioned-render-test: options.nodeRenderers[\'versioned-render-test\'] for version 2 is required');
        }));
    });

    describe('hasVisibility', function () {
        let NodeWithVisibility;
        let $createNodeWithVisibility;

        before(function () {
            NodeWithVisibility = utils.generateDecoratorNode({
                nodeType: 'visibility-test',
                properties: [],
                hasVisibility: true
            });

            $createNodeWithVisibility = (dataset) => {
                return new NodeWithVisibility(dataset);
            };

            editor = createHeadlessEditor({nodes: [NodeWithVisibility]});
        });

        it('adds visibility property with default', editorTest(function () {
            const node = $createNodeWithVisibility();

            node.visibility.should.deepEqual(defaultVisibility, 'node.visibility');
            node.getDataset().visibility.should.deepEqual(defaultVisibility, 'node.getDataset().visibility');
            node.exportJSON().visibility.should.deepEqual(defaultVisibility, 'node.exportJSON().visibility');
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
            node.getDataset().visibility.should.deepEqual(newVisibility, 'node.getDataset().visibility');
            node.exportJSON().visibility.should.deepEqual(newVisibility, 'node.exportJSON().visibility');
        }));

        it('ensures default doesn\'t change when nested visibility objects are updated', editorTest(function () {
            const node = $createNodeWithVisibility();

            // NOTE: this wouldn't trigger a Lexical node update, it's just to show
            // that the default can't be accidentally changed by reference
            node.visibility.web.nonMember = false;

            NodeWithVisibility.getPropertyDefaults().visibility.should.deepEqual(defaultVisibility);
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
