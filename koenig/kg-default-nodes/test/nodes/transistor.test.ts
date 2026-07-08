import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot, type LexicalEditor} from 'lexical';
import {dom} from '../test-utils/index.js';
import {TransistorNode, $createTransistorNode, $isTransistorNode, type ExportDOMOptions, type TransistorData} from '../../src/index.js';
import {renderTransistorNode} from '../../src/nodes/transistor/transistor-renderer.js';

const editorNodes = [TransistorNode];

describe('TransistorNode', function () {
    let editor: LexicalEditor;
    let dataset: TransistorData;
    let exportOptions: ExportDOMOptions;

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
        assert.equal($isTransistorNode(transistorNode), true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);

            assert.equal(transistorNode.accentColor, dataset.accentColor);
            assert.equal(transistorNode.backgroundColor, dataset.backgroundColor);
            // Default visibility should be members-only (nonMember: false)
            const visibility = transistorNode.visibility as Record<string, Record<string, unknown>>;
            assert.equal((visibility.web as Record<string, unknown>).nonMember, false);
            assert.equal((visibility.web as Record<string, unknown>).memberSegment, 'status:free,status:-free');
            assert.equal((visibility.email as Record<string, unknown>).memberSegment, 'status:free,status:-free');
        }));

        it('has setters for all properties', editorTest(function () {
            const transistorNode = new TransistorNode();

            assert.equal(transistorNode.accentColor, '');
            transistorNode.accentColor = '#FF0000';
            assert.equal(transistorNode.accentColor, '#FF0000');

            assert.equal(transistorNode.backgroundColor, '');
            transistorNode.backgroundColor = '#000000';
            assert.equal(transistorNode.backgroundColor, '#000000');

            transistorNode.visibility = {
                web: {
                    nonMember: false,
                    memberSegment: 'status:free'
                },
                email: {
                    memberSegment: 'status:free'
                }
            };
            assert.deepEqual(transistorNode.visibility, {
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

            assert.equal(transistorNodeDataset.accentColor, dataset.accentColor);
            assert.equal(transistorNodeDataset.backgroundColor, dataset.backgroundColor);
            assert.equal((transistorNodeDataset.visibility as Record<string, Record<string, unknown>>).web.nonMember, false);
        }));

        it('can be created without data', editorTest(function () {
            const transistorNode = $createTransistorNode();

            assert.equal(transistorNode.accentColor, '');
            assert.equal(transistorNode.backgroundColor, '');
            assert.equal((transistorNode.visibility as Record<string, Record<string, unknown>>).web.nonMember, false);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            assert.equal(TransistorNode.getType(), 'transistor');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            const transistorNodeDataset = transistorNode.getDataset();
            const clone = TransistorNode.clone(transistorNode) as TransistorNode;
            const cloneDataset = clone.getDataset();

            assert.deepEqual(cloneDataset, {...transistorNodeDataset});
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            assert.equal(transistorNode.hasEditMode(), true);
        }));
    });

    describe('isEmpty', function () {
        it('returns false', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            assert.equal(transistorNode.isEmpty(), false);
        }));
    });

    describe('default visibility', function () {
        it('defaults to members-only (nonMember: false)', editorTest(function () {
            const transistorNode = new TransistorNode();
            const visibility = transistorNode.visibility as Record<string, Record<string, unknown>>;
            assert.equal(visibility.web.nonMember, false);
            assert.equal(visibility.web.memberSegment, 'status:free,status:-free');
            assert.equal(visibility.email.memberSegment, 'status:free,status:-free');
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
            assert.deepEqual(transistorNode.visibility, customVisibility);
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
            const {element} = transistorNode.exportDOM(editor, exportOptions);
            const el = element as HTMLElement;

            assert.equal(el.tagName, 'FIGURE');
            assert.equal(el.classList.contains('kg-card'), true);
            assert.equal(el.classList.contains('kg-transistor-card'), true);

            const iframe = el.querySelector('iframe');
            assert.ok(iframe);
            assert.equal(iframe.getAttribute('data-src'), 'https://partner.transistor.fm/ghost/embed/{uuid}');
            assert.equal(iframe.getAttribute('width'), '100%');
            assert.equal(iframe.getAttribute('height'), '180');
            assert.equal(iframe.getAttribute('frameborder'), 'no');
            assert.equal(iframe.getAttribute('scrolling'), 'no');
            assert.equal(iframe.hasAttribute('seamless'), true);
        }));

        it('defaults options before validating document creation', editorTest(function () {
            assert.throws(
                () => renderTransistorNode({visibility: publicVisibility}),
                /Must be passed a `createDocument` function as an option when used in a non-browser environment/
            );
        }));

        it('includes ctx param when siteUuid is in options', editorTest(function () {
            const transistorNode = new TransistorNode({visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(editor, {...exportOptions, siteUuid: 'abc123'});
            const el = element as HTMLElement;

            const iframe = el.querySelector('iframe');
            assert.equal(iframe!.getAttribute('data-src'), 'https://partner.transistor.fm/ghost/embed/{uuid}?ctx=abc123');
        }));

        it('does not include ctx param when siteUuid is not provided', editorTest(function () {
            const transistorNode = new TransistorNode({visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(editor, exportOptions);
            const el = element as HTMLElement;

            const iframe = el.querySelector('iframe');
            assert.ok(!iframe!.getAttribute('data-src')!.includes('ctx='));
        }));

        it('includes background detection script that reads data-src', editorTest(function () {
            const transistorNode = new TransistorNode({visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(editor, exportOptions);
            const el = element as HTMLElement;

            const script = el.querySelector('script');
            assert.ok(script);
            assert.ok(script.textContent!.includes('currentScript'));
            assert.ok(script.textContent!.includes('data-src'));
            assert.ok(script.textContent!.includes('background'));
        }));

        it('includes noscript fallback with src', editorTest(function () {
            const transistorNode = new TransistorNode({visibility: publicVisibility});
            const {element} = transistorNode.exportDOM(editor, exportOptions);
            const el = element as HTMLElement;

            const noscript = el.querySelector('noscript');
            assert.ok(noscript);
            const fallbackIframe = noscript.querySelector('iframe');
            assert.ok(fallbackIframe);
            assert.equal(fallbackIframe.getAttribute('src'), 'https://partner.transistor.fm/ghost/embed/{uuid}');
        }));

        it('renders with web visibility gating', editorTest(function () {
            exportOptions.target = 'web';
            // Default visibility has nonMember: false
            const transistorNode = new TransistorNode({});
            const {element} = transistorNode.exportDOM(editor, exportOptions);
            const el = element as HTMLTextAreaElement;

            // Should be wrapped in visibility gating
            assert.equal(el.tagName, 'TEXTAREA');
            assert.match(el.value, /<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
        }));

        it('renders with email visibility when segment is restricted', editorTest(function () {
            exportOptions.target = 'email';
            const transistorNode = new TransistorNode({
                visibility: {
                    web: {nonMember: false, memberSegment: 'status:free,status:-free'},
                    email: {memberSegment: 'status:-free'} // paid only
                }
            });
            const result = transistorNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const type = result.type;

            assert.equal(type, 'html');
            assert.equal(element.tagName, 'DIV');
            assert.equal(element.dataset.ghSegment, 'status:-free');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const transistorNode = new TransistorNode(dataset);
            const json = transistorNode.exportJSON();

            assert.deepEqual(json, {
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

            assert.equal(json.accentColor, '');
            assert.equal(json.backgroundColor, '');
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done: (err?: unknown) => void) {
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
                    const [transistorNode] = $getRoot().getChildren() as TransistorNode[];
                    assert.equal($isTransistorNode(transistorNode), true);
                    assert.equal(transistorNode.accentColor, '#FF5500');
                    assert.equal(transistorNode.backgroundColor, '#000000');
                    const visibility = transistorNode.visibility as Record<string, Record<string, unknown>>;
                    assert.equal(visibility.web.nonMember, false);
                    assert.equal(visibility.web.memberSegment, 'status:-free');

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
            assert.equal(transistorNode.getTextContent(), '');
        }));
    });
});
