import * as React from 'react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {DecoratorNode, createCommand} from 'lexical';
import {ReactComponent as DividerCardIcon} from '../assets/icons/kg-card-type-divider.svg';
import {HorizontalRuleCard} from '../components/ui/cards/HorizontalRuleCard';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

export class HorizontalRuleNode extends DecoratorNode {
    static getType() {
        return 'horizontalrule';
    }

    static clone(node) {
        return new HorizontalRuleNode(node.__key);
    }

    static importJSON(serializedNode) {
        return $createHorizontalRuleNode();
    }

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

    exportJSON() {
        return {
            type: 'horizontalrule',
            version: 1
        };
    }

    createDOM() {
        const div = document.createElement('div');
        return div;
    }

    getTextContent() {
        return '\n';
    }

    isInline() {
        return false;
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} className="inline-block">
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
