const {DecoratorNode} = require('lexical');

class ImageNode extends DecoratorNode {
    constructor({src, caption, altText,cardWidth}) {
        super();
        this.src = src || '';
        this.caption = caption || '';
        this.altText = altText || '';
        this.cardWidth = cardWidth || 'regular';
    }

    static getType() {
        return 'image';
    }

    static importJSON(serializedNode) {
        return $createImageNode(serializedNode);
    }
}

const $createImageNode = (serializedNode) => {
    const node = new ImageNode(serializedNode);
    return node;
};

const $isImageNode = (node) => {
    return node instanceof ImageNode;
};

module.exports = {
    ImageNode,
    $createImageNode,
    $isImageNode
};