import * as React from 'react';
import DividerCardIcon from '../assets/icons/kg-card-type-preview.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {PaywallNode as BasePaywallNode} from '@tryghost/kg-default-nodes';
import {PaywallCard} from '../components/ui/cards/PaywallCard';
import {createCommand} from 'lexical';

export const INSERT_PAYWALL_COMMAND = createCommand();

export class PaywallNode extends BasePaywallNode {
    static kgMenu = {
        label: 'Public preview',
        desc: 'Attract signups with a public intro',
        Icon: DividerCardIcon,
        insertCommand: INSERT_PAYWALL_COMMAND,
        matches: ['public preview','preview', 'public intro', 'members only', 'paywall'],
        priority: 9,
        shortcut: '/paywall'
    };

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper className="inline-block" nodeKey={this.getKey()}>
                <PaywallCard />
            </KoenigCardWrapper>
        );
    }
}

export function $createPaywallNode() {
    return new PaywallNode();
}

export function $isPaywallNode(node) {
    return node instanceof PaywallNode;
}
