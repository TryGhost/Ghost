const assert = require('node:assert/strict');
const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {dom} = require('../test-utils');
const {TransistorNode, $isTransistorNode} = require('../../');

const editorNodes = [TransistorNode];

describe('TransistorNode', function () {
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
            accentColor: '#8B5CF6',
            backgroundColor: '#FFFFFF'
        };
        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isTransistorNode', editorTest(function () {
        const transistorNode = new TransistorNode(dataset);
        assert.strictEqual($isTransistorNode(transistorNode), true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);

            assert.strictEqual(transistorNode.accentColor, dataset.accentColor);
            assert.strictEqual(transistorNode.backgroundColor, dataset.backgroundColor);
            // Default visibility should be members-only (nonMember: false)
            assert.strictEqual(transistorNode.visibility.web.nonMember, false);
            assert.strictEqual(transistorNode.visibility.web.memberSegment, 'status:free,status:-free');
            assert.strictEqual(transistorNode.visibility.email.memberSegment, 'status:free,status:-free');
        }));

        it('has setters for all properties', editorTest(function () {
            const transistorNode = new TransistorNode();

            assert.strictEqual(transistorNode.accentColor, '');
            transistorNode.accentColor = '#FF0000';
            assert.strictEqual(transistorNode.accentColor, '#FF0000');

            assert.strictEqual(transistorNode.backgroundColor, '');
            transistorNode.backgroundColor = '#000000';
            assert.strictEqual(transistorNode.backgroundColor, '#000000');

            transistorNode.visibility = {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            };
            assert.deepStrictEqual(transistorNode.visibility, {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            });
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            const transistorNodeDataset = transistorNode.getDataset();

            assert.strictEqual(transistorNodeDataset.accentColor, dataset.accentColor);
            assert.strictEqual(transistorNodeDataset.backgroundColor, dataset.backgroundColor);
            assert.strictEqual(transistorNodeDataset.visibility.web.nonMember, false);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            assert.strictEqual(TransistorNode.getType(), 'transistor');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            const transistorNodeDataset = transistorNode.getDataset();
            const clone = TransistorNode.clone(transistorNode);
            const cloneDataset = clone.getDataset();

            assert.deepStrictEqual(cloneDataset, {...transistorNodeDataset});
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            assert.strictEqual(transistorNode.hasEditMode(), true);
        }));
    });

    describe('isEmpty', function () {
        it('returns false', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            assert.strictEqual(transistorNode.isEmpty(), false);
        }));
    });

    describe('default visibility', function () {
        it('defaults to members-only (nonMember: false)', editorTest(function () {
            const transistorNode = new TransistorNode();
            assert.strictEqual(transistorNode.visibility.web.nonMember, false);
            assert.strictEqual(transistorNode.visibility.web.memberSegment, 'status:free,status:-free');
            assert.strictEqual(transistorNode.visibility.email.memberSegment, 'status:free,status:-free');
        }));

        it('preserves custom visibility when provided', editorTest(function () {
            const customVisibility = {
                web: {
                    nonMember: false,
                    memberSegment: 'status:-free' // paid only
                },
                email: {
                    memberSegment: 'status:-free'
                }
            };
            const transistorNode = new TransistorNode({visibility: customVisibility});
            assert.deepStrictEqual(transistorNode.visibility, customVisibility);
        }));
    });

    describe('exportDOM', function () {
        // Public visibility for basic rendering tests (no visibility wrapping)
        const publicVisibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free,status:-free'
            }
        };

        it('renders an iframe with the correct base URL', editorTest(function () {
            const transistorNode = new TransistorNode({visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(exportOptions);

            assert.strictEqual(element.tagName, 'FIGURE');
            assert.strictEqual(element.classList.contains('kg-card'), true);
            assert.strictEqual(element.classList.contains('kg-transistor-card'), true);

            const iframe = element.querySelector('iframe');
            assert.ok(iframe);
            assert.strictEqual(iframe.getAttribute('src'), 'https://partner.transistor.fm/ghost/embed/{uuid}');
            assert.strictEqual(iframe.getAttribute('width'), '100%');
            assert.strictEqual(iframe.getAttribute('height'), '180');
            assert.strictEqual(iframe.getAttribute('frameborder'), 'no');
            assert.strictEqual(iframe.getAttribute('scrolling'), 'no');
            assert.strictEqual(iframe.hasAttribute('seamless'), true);
        }));

        it('includes color param when accentColor is set', editorTest(function () {
            const transistorNode = new TransistorNode({accentColor: '#8B5CF6', visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(exportOptions);

            const iframe = element.querySelector('iframe');
            assert.strictEqual(iframe.getAttribute('src'), 'https://partner.transistor.fm/ghost/embed/{uuid}?color=8B5CF6');
        }));

        it('includes background param when backgroundColor is set', editorTest(function () {
            const transistorNode = new TransistorNode({backgroundColor: '#FFFFFF', visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(exportOptions);

            const iframe = element.querySelector('iframe');
            assert.strictEqual(iframe.getAttribute('src'), 'https://partner.transistor.fm/ghost/embed/{uuid}?background=FFFFFF');
        }));

        it('includes both color params when both are set', editorTest(function () {
            const transistorNode = new TransistorNode({
                accentColor: '#8B5CF6',
                backgroundColor: '#1F2937',
                visibility: publicVisibility
            });
            const {element} = transistorNode.exportDOM(exportOptions);

            const iframe = element.querySelector('iframe');
            assert.strictEqual(iframe.getAttribute('src'), 'https://partner.transistor.fm/ghost/embed/{uuid}?color=8B5CF6&background=1F2937');
        }));

        it('strips # from color values', editorTest(function () {
            const transistorNode = new TransistorNode({
                accentColor: '#FF0000',
                backgroundColor: '#00FF00',
                visibility: publicVisibility
            });
            const {element} = transistorNode.exportDOM(exportOptions);

            const iframe = element.querySelector('iframe');
            const src = iframe.getAttribute('src');
            assert.ok(!src.includes('#'));
            assert.ok(src.includes('color=FF0000'));
            assert.ok(src.includes('background=00FF00'));
        }));

        it('renders with web visibility gating', editorTest(function () {
            exportOptions.target = 'web';
            // Default visibility has nonMember: false
            const transistorNode = new TransistorNode({});
            const {element} = transistorNode.exportDOM(exportOptions);

            // Should be wrapped in visibility gating
            assert.strictEqual(element.tagName, 'TEXTAREA');
            assert.match(element.value, /<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
        }));

        it('renders with email visibility when segment is restricted', editorTest(function () {
            exportOptions.target = 'email';
            const transistorNode = new TransistorNode({
                visibility: {
                    web: {nonMember: false, memberSegment: 'status:free,status:-free'},
                    email: {memberSegment: 'status:-free'} // paid only
                }
            });
            const {element, type} = transistorNode.exportDOM(exportOptions);

            assert.strictEqual(type, 'html');
            assert.strictEqual(element.tagName, 'DIV');
            assert.strictEqual(element.dataset.ghSegment, 'status:-free');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            const json = transistorNode.exportJSON();

            assert.deepStrictEqual(json, {
                type: 'transistor',
                version: 1,
                accentColor: '#8B5CF6',
                backgroundColor: '#FFFFFF',
                visibility: {
                    web: {
                        nonMember: false,
                        memberSegment: 'status:free,status:-free'
                    },
                    email: {
                        memberSegment: 'status:free,status:-free'
                    }
                }
            });
        }));

        it('exports empty strings for unset colors', editorTest(function () {
            const transistorNode = new TransistorNode({});
            const json = transistorNode.exportJSON();

            assert.strictEqual(json.accentColor, '');
            assert.strictEqual(json.backgroundColor, '');
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedData = JSON.stringify({
                root: {
                    children: [{
                        type: 'transistor',
                        version: 1,
                        accentColor: '#FF5500',
                        backgroundColor: '#000000',
                        visibility: {
                            web: {
                                nonMember: false,
                                memberSegment: 'status:-free'
                            },
                            email: {
                                memberSegment: 'status:-free'
                            }
                        }
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
                    const [transistorNode] = $getRoot().getChildren();
                    assert.strictEqual($isTransistorNode(transistorNode), true);
                    assert.strictEqual(transistorNode.accentColor, '#FF5500');
                    assert.strictEqual(transistorNode.backgroundColor, '#000000');
                    assert.strictEqual(transistorNode.visibility.web.nonMember, false);
                    assert.strictEqual(transistorNode.visibility.web.memberSegment, 'status:-free');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns empty string', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            assert.strictEqual(transistorNode.getTextContent(), '');
        }));
    });
});
