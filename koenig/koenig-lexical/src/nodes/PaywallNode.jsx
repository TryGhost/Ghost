import * as React from 'react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {PaywallNode as BasePaywallNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as DividerCardIcon} from '../assets/icons/kg-card-type-preview.svg';
import {PaywallCard} from '../components/ui/cards/PaywallCard';
import {createCommand} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export const INSERT_PAYWALL_COMMAND = createCommand();

export class PaywallNode extends BasePaywallNode {
    static kgMenu = {
        label: 'Public preview',
        desc: 'Attract signups with a public intro',
        Icon: DividerCardIcon,
        insertCommand: INSERT_PAYWALL_COMMAND,
        matches: ['public preview', 'public intro', 'members only', 'paywall'],
        priority: 9
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
