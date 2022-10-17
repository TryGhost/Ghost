import * as React from 'react';
import {createCommand, DecoratorNode} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as DividerCardIcon} from '../assets/icons/kg-card-type-divider.svg';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

function HorizontalRuleComponent({nodeKey}) {
    return (
        <hr className="block h-[1px] border-0 border-t border-grey-300" />
    );
}

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
        insertCommand: INSERT_HORIZONTAL_RULE_COMMAND
    };

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
                <HorizontalRuleComponent nodeKey={this.getKey()} />
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
