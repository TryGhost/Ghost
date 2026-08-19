import {createHeadlessEditor} from '@lexical/headless';
import type {LexicalEditor} from 'lexical';
import {dom} from '../test-utils/index.js';
import {PaywallV2Node, $createPaywallV2Node, $isPaywallV2Node, getPaywallMemberSegment, getPaywallPostVisibility} from '../../src/index.js';

const editorNodes = [PaywallV2Node];

describe('PaywallV2Node', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: Record<string, unknown>;

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

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});
        dataset = {
            access: 'paid',
            tiers: ['gold', 'silver'],
            webLayout: 'immersive',
            webAlignment: 'left',
            webBackgroundColor: 'grey',
            emailLayout: 'minimal',
            emailAlignment: 'center',
            emailBackgroundColor: 'blue',
            webHeading: 'Upgrade to continue reading',
            webTextValue: 'This part is for paid members.',
            webShowButton: true,
            webButtonText: 'Upgrade',
            webButtonUrl: 'http://blog.com/#/portal/signup',
            webImageUrl: 'http://blog.com/image1.jpg',
            webImageWidth: 200,
            webImageHeight: 100,
            emailHeading: 'Keep reading on the web',
            emailTextValue: 'Upgrade to get the rest in your inbox.',
            emailShowButton: true,
            emailButtonText: 'Upgrade',
            emailButtonUrl: 'http://blog.com/#/portal/signup',
            emailImageUrl: '',
            emailImageWidth: null,
            emailImageHeight: null
        };
        exportOptions = {
            exportFormat: 'html',
            dom,
            feature: {},
            design: {}
        };
    });

    it('matches node with $isPaywallV2Node', editorTest(function () {
        const node = new PaywallV2Node(dataset);
        expect($isPaywallV2Node(node)).toBe(true);
    }));

    it('has the expected node type', editorTest(function () {
        expect(PaywallV2Node.getType()).toEqual('paywall-v2');
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const node = $createPaywallV2Node(dataset);

            expect(node.access).toEqual('paid');
            expect(node.tiers).toEqual(['gold', 'silver']);
            expect(node.webHeading).toEqual('Upgrade to continue reading');
            expect(node.emailHeading).toEqual('Keep reading on the web');
            expect(node.webBackgroundColor).toEqual('grey');
            expect(node.emailBackgroundColor).toEqual('blue');
        }));

        it('defaults access to null so the editor can ask the access question', editorTest(function () {
            const node = $createPaywallV2Node();
            expect(node.access).toBeNull();
            expect(node.tiers).toEqual([]);
        }));

        it('defaults both paywalls to centered', editorTest(function () {
            const node = $createPaywallV2Node();
            expect(node.webAlignment).toEqual('center');
            expect(node.emailAlignment).toEqual('center');
        }));

        it('keeps the web and email design settings independent', editorTest(function () {
            const node = $createPaywallV2Node(dataset);

            expect(node.webLayout).toEqual('immersive');
            expect(node.emailLayout).toEqual('minimal');
        }));

        it('defaults both buttons to shown, pointing at Portal signup', editorTest(function () {
            const node = $createPaywallV2Node();

            expect(node.webShowButton).toBe(true);
            expect(node.emailShowButton).toBe(true);
            // the site paywall invites signup, email invites an upgrade
            expect(node.webButtonText).toEqual('Subscribe now');
            expect(node.emailButtonText).toEqual('Upgrade');
            expect(node.webButtonUrl).toEqual('#/portal/signup');
            expect(node.emailButtonUrl).toEqual('#/portal/signup');
        }));

        it('returns a copy of tiers rather than the internal array', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            const tiers = node.tiers;
            tiers.push('bronze');

            expect(node.tiers).toEqual(['gold', 'silver']);
        }));

        it('sets tiers via setTiers', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            node.setTiers(['bronze']);

            expect(node.tiers).toEqual(['bronze']);
        }));

        it('rejects non-string tiers', editorTest(function () {
            const node = $createPaywallV2Node(dataset);

            expect(() => node.setTiers([1] as unknown as string[])).toThrow();
        }));

        it('getDataset returns all properties including tiers', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            const nodeDataset = node.getDataset();

            expect(nodeDataset.tiers).toEqual(['gold', 'silver']);
            expect(nodeDataset.access).toEqual('paid');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data including tiers', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            const json = node.exportJSON();

            expect(json.type).toEqual('paywall-v2');
            expect(json.access).toEqual('paid');
            expect(json.tiers).toEqual(['gold', 'silver']);
            expect(json.webHeading).toEqual('Upgrade to continue reading');
            expect(json.emailTextValue).toEqual('Upgrade to get the rest in your inbox.');
        }));
    });

    describe('importJSON', function () {
        it('round-trips through JSON', editorTest(function () {
            const json = $createPaywallV2Node(dataset).exportJSON();
            const node = PaywallV2Node.importJSON(json);

            expect(node.access).toEqual('paid');
            expect(node.tiers).toEqual(['gold', 'silver']);
            expect(node.webButtonUrl).toEqual('http://blog.com/#/portal/signup');
        }));
    });

    describe('clone', function () {
        it('preserves tiers', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            const clone = PaywallV2Node.clone(node);

            expect(clone.tiers).toEqual(['gold', 'silver']);
        }));
    });

    describe('exportDOM', function () {
        it('renders the web paywall and the members-only marker', editorTest(function () {
            const node = $createPaywallV2Node(dataset);
            const {element, type} = node.exportDOM(editor, exportOptions) as {element: HTMLTextAreaElement; type: string};

            expect(type).toEqual('value');
            expect(element.value).toContain('kg-paywall-card');
            expect(element.value).toContain('<!--members-only-->');
        }));
    });

    describe('urlTransformMap', function () {
        it('marks the button and image URLs for transformation', editorTest(function () {
            expect(PaywallV2Node.urlTransformMap).toMatchObject({
                webButtonUrl: 'url',
                webImageUrl: 'url',
                emailButtonUrl: 'url',
                emailImageUrl: 'url'
            });
        }));
    });
});

describe('paywall access helpers', function () {
    it('maps members access to no member segment', function () {
        expect(getPaywallMemberSegment('members')).toEqual('');
    });

    it('maps paid access to the free member segment', function () {
        expect(getPaywallMemberSegment('paid')).toEqual('status:free');
    });

    it('negates the selected tiers', function () {
        expect(getPaywallMemberSegment('tiers', ['gold', 'silver'])).toEqual('product:-\'gold\'+product:-\'silver\'');
    });

    it('treats tiers access with no tiers as gating everyone', function () {
        expect(getPaywallMemberSegment('tiers', [])).toEqual('status:free,status:-free');
    });

    it('falls back to members for an unresolved paywall', function () {
        expect(getPaywallMemberSegment(null)).toEqual('');
        expect(getPaywallPostVisibility(null)).toEqual('members');
    });

    it('maps access straight onto post visibility', function () {
        expect(getPaywallPostVisibility('paid')).toEqual('paid');
        expect(getPaywallPostVisibility('tiers')).toEqual('tiers');
    });
});
