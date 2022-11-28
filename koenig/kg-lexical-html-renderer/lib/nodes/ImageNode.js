const {DecoratorNode} = require('lexical');

class ImageNode extends DecoratorNode {
    constructor({src, caption, altText,cardWidth, width, height, title}) {
        super();
        this.src = src || '';
        this.caption = caption || '';
        this.altText = altText || '';
        this.cardWidth = cardWidth || 'regular';
        this.width = width || null;
        this.height = height || null;
        this.title = title || '';
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
