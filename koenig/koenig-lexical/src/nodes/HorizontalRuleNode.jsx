import * as React from 'react';
import DividerCardIcon from '../assets/icons/kg-card-type-divider.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {HorizontalRuleNode as BaseHorizontalRuleNode} from '@tryghost/kg-default-nodes';
import {HorizontalRuleCard} from '../components/ui/cards/HorizontalRuleCard';
import {createCommand} from 'lexical';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

export class HorizontalRuleNode extends BaseHorizontalRuleNode {
    static kgMenu = {
        label: 'Divider',
        desc: 'Insert a dividing line',
        Icon: DividerCardIcon,
        insertCommand: INSERT_HORIZONTAL_RULE_COMMAND,
        matches: ['divider', 'horizontal-rule', 'hr'],
        priority: 5,
        shortcut: '/hr'
    };

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper className="inline-block" nodeKey={this.getKey()}>
                <HorizontalRuleCard />
            </KoenigCardWrapper>
        );
    }
}

export function $createHorizontalRuleNode() {
    return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
