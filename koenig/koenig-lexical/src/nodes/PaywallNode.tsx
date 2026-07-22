import DividerCardIcon from '../assets/icons/kg-card-type-preview.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {PaywallNode as BasePaywallNode} from '@tryghost/kg-default-nodes';
import {PaywallNodeComponent} from './PaywallNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_PAYWALL_COMMAND = createCommand();

export class PaywallNode extends BasePaywallNode {
    static kgMenu = {
        label: 'Public preview',
        desc: 'Attract signups with a public intro',
        Icon: DividerCardIcon,
        insertCommand: INSERT_PAYWALL_COMMAND,
        matches: ['public preview','preview', 'public intro', 'members only', 'paywall'],
        priority: 6,
        shortcut: '/paywall'
    };

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper className="inline-block" nodeKey={this.getKey()}>
                <PaywallNodeComponent
                    emailBody={this.emailBody}
                    emailButtonText={this.emailButtonText}
                    emailButtonUrl={this.emailButtonUrl}
                    emailTitle={this.emailTitle}
                    nodeKey={this.getKey()}
                />
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
