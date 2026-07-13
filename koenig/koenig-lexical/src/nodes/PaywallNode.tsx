import DividerCardIcon from '../assets/icons/kg-card-type-preview.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {PaywallNode as BasePaywallNode} from '@tryghost/kg-default-nodes';
import {PaywallNodeComponent} from './PaywallNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_PAYWALL_COMMAND = createCommand();

export class PaywallNode extends BasePaywallNode {
    static kgMenu = {
        label: 'Public preview',
        desc: 'Attract signups with a customisable paywall',
        Icon: DividerCardIcon,
        insertCommand: INSERT_PAYWALL_COMMAND,
        matches: ['public preview','preview', 'public intro', 'members only', 'paywall'],
        priority: 6,
        shortcut: '/paywall',
        // a post can only have one paywall, so hide the menu item once present
        isHidden: ({hasPaywall}) => !!hasPaywall
    };

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                {/* `variants` holds the per-permutation PaywallConfig JSON string */}
                <PaywallNodeComponent config={this.variants} nodeKey={this.getKey()} />
            </KoenigCardWrapper>
        );
    }
}

export function $createPaywallNode(dataset) {
    return new PaywallNode(dataset);
}

export function $isPaywallNode(node) {
    return node instanceof PaywallNode;
}
