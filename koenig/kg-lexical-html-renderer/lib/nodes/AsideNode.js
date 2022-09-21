const {ElementNode} = require('lexical');

class AsideNode extends ElementNode {
    static getType() {
        return 'aside';
    }

    static importJSON(/*serializedNode*/) {
        return $createAsideNode();
    }

    isInline() {
        return false;
    }

    getTextContent() {
        return '> ';
    }
}

function $createAsideNode() {
    return new AsideNode;
}

function $isAsideNode(node) {
    return node instanceof AsideNode;
}

module.exports = {
    AsideNode,
    $createAsideNode,
    $isAsideNode
};
