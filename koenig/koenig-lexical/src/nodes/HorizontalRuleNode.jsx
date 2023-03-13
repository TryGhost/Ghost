import * as React from 'react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {HorizontalRuleNode as BaseHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as DividerCardIcon} from '../assets/icons/kg-card-type-divider.svg';
import {HorizontalRuleCard} from '../components/ui/cards/HorizontalRuleCard';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_HORIZONTAL_RULE_COMMAND} from '@tryghost/kg-default-nodes';

export class HorizontalRuleNode extends BaseHorizontalRuleNode {
    static kgMenu = {
        label: 'Divider',
        desc: 'Insert a dividing line',
        Icon: DividerCardIcon,
        insertCommand: INSERT_HORIZONTAL_RULE_COMMAND,
        matches: ['divider', 'horizontal-rule', 'hr']
    };

    getIcon() {
        return DividerCardIcon;
    }

    createDOM() {
        const div = document.createElement('div');
        return div;
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
