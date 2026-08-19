import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {PORTAL_SIGNUP_URL, renderPaywallV2Node} from './paywallv2-renderer.js';

export type PaywallAccess = 'members' | 'paid' | 'tiers';

// `access: null` means the author hasn't answered the access question yet. The
// editor renders the question instead of the card while that's the case, and the
// renderer falls back to `members` so a half-finished card can never leak a post.
// The web and email paywalls are configured independently - every setting in the
// card's panel exists once per target. Only `access`/`tiers` are shared, since
// they describe the post's gating rather than either rendering of it.
const paywallV2Properties = {
    access: {default: null as PaywallAccess | null},

    webLayout: {default: 'immersive'},
    webAlignment: {default: 'center'},
    webBackgroundColor: {default: 'grey'},
    webLinkColor: {default: 'text'},
    webShowDividers: {default: true},
    webButtonColor: {default: '#000000'},
    webButtonTextColor: {default: '#ffffff'},
    webHeading: {default: '', wordCount: true},
    webTextValue: {default: '', wordCount: true},
    webShowButton: {default: true},
    webButtonText: {default: 'Subscribe now'},
    // Portal links default to a bare hash so they resolve against whatever post
    // the card ends up in; the email renderer makes them absolute
    webButtonUrl: {default: PORTAL_SIGNUP_URL, urlType: 'url'},
    webImageUrl: {default: '' as string | null, urlType: 'url'},
    webImageWidth: {default: null as number | null},
    webImageHeight: {default: null as number | null},

    emailLayout: {default: 'immersive'},
    emailAlignment: {default: 'center'},
    emailBackgroundColor: {default: 'grey'},
    emailLinkColor: {default: 'text'},
    emailShowDividers: {default: true},
    emailButtonColor: {default: '#000000'},
    emailButtonTextColor: {default: '#ffffff'},
    // the email paywall is never part of the readable post, so it stays out of the word count
    emailHeading: {default: ''},
    emailTextValue: {default: ''},
    emailShowButton: {default: true},
    emailButtonText: {default: 'Upgrade'},
    emailButtonUrl: {default: PORTAL_SIGNUP_URL, urlType: 'url'},
    emailImageUrl: {default: '' as string | null, urlType: 'url'},
    emailImageWidth: {default: null as number | null},
    emailImageHeight: {default: null as number | null}
} satisfies DecoratorNodePropertyMap;

export type PaywallV2Data = DecoratorNodeData<typeof paywallV2Properties> & {tiers?: string[]};

export class PaywallV2Node extends generateDecoratorNode({
    nodeType: 'paywall-v2',
    properties: paywallV2Properties,
    defaultRenderFn: renderPaywallV2Node
}) {
    /* override: `tiers` is an array, which the generated property handling doesn't cover */
    constructor(data: PaywallV2Data = {}, key?: string) {
        super(data, key);
        this.__tiers = Array.isArray(data.tiers) ? [...data.tiers] : [];
    }

    static getPropertyDefaults() {
        return {
            ...super.getPropertyDefaults(),
            tiers: [] as string[]
        };
    }

    static importJSON(serializedNode: Record<string, unknown>) {
        return new this(serializedNode as PaywallV2Data);
    }

    get tiers(): string[] {
        const self = this.getLatest();
        return [...(self.__tiers as string[])];
    }

    set tiers(tiers: string[]) {
        this.setTiers(tiers);
    }

    getDataset() {
        return {
            ...super.getDataset(),
            tiers: this.tiers
        };
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            tiers: this.tiers
        };
    }

    setTiers(tiers: string[]) {
        if (!Array.isArray(tiers) || !tiers.every(tier => typeof tier === 'string')) {
            throw new Error('Invalid argument: Expected an array of strings.');
        }

        const writable = this.getWritable();
        writable.__tiers = [...tiers];
    }
}

export const $createPaywallV2Node = (dataset?: PaywallV2Data) => {
    return new PaywallV2Node(dataset);
};

export const $isPaywallV2Node = (node: unknown): node is PaywallV2Node => {
    return node instanceof PaywallV2Node;
};
