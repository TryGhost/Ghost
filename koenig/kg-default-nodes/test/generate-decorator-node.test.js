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
