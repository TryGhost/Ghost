import * as React from 'react';
import {createCommand, DecoratorNode} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

function HorizontalRuleComponent() {
    return (
        <KoenigCardWrapper>
            <hr />
        </KoenigCardWrapper>
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
        div.style.display = 'contents';
        return div;
    }

    getTextContent() {
        return '\n';
    }

    isTopLevel() {
        return true;
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return <HorizontalRuleComponent />;
    }
}

export function $createHorizontalRuleNode() {
    return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
