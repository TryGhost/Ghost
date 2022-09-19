const {DecoratorNode} = require('lexical');

class HorizontalRuleNode extends DecoratorNode {
    static getType() {
        return 'horizontalrule';
    }

    static importJSON(/*serializedNode*/) {
        return $createHorizontalRuleNode();
    }

    isInline() {
        return false;
    }

    getTextContent() {
        return '\n---\n';
    }
}

function $createHorizontalRuleNode() {
    return new HorizontalRuleNode;
}

function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}

module.exports = {
    HorizontalRuleNode,
    $createHorizontalRuleNode,
    $isHorizontalRuleNode
};
