import * as React from 'react';
import {createCommand, DecoratorNode} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

function HorizontalRuleComponent({nodeKey}) {
    return (
        <div className="inline-block">
            <KoenigCardWrapper nodeKey={nodeKey}>
                <hr className="block h-[1px] border-0 border-t border-grey-300" />
            </KoenigCardWrapper>
        </div>
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
        return <HorizontalRuleComponent nodeKey={this.getKey()} />;
    }
}

export function $createHorizontalRuleNode() {
    return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
