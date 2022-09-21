import {
    $createParagraphNode,
    ElementNode
} from 'lexical';
import {
    addClassNamesToElement
} from '@lexical/utils';

export class AsideNode extends ElementNode {
    static getType() {
        return 'aside';
    }

    static clone(node) {
        return new AsideNode(node.__key);
    }

    constructor(key) {
        super(key);
    }

    // View

    createDOM(config) {
        const element = document.createElement('aside');
        addClassNamesToElement(element, config.theme.aside);
        return element;
    }
    updateDOM(prevNode, dom) {
        return false;
    }

    static importDOM() {
        return {
            aside: node => ({
                conversion: convertAsideElement,
                priority: 0
            })
        };
    }

    static importJSON(serializedNode) {
        const node = $createAsideNode();
        node.setFormat(serializedNode.format);
        node.setIndent(serializedNode.indent);
        node.setDirection(serializedNode.direction);
        return node;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'aside'
        };
    }

    // Mutation

    insertNewAfter() {
        const newBlock = $createParagraphNode();
        const direction = this.getDirection();
        newBlock.setDirection(direction);
        this.insertNewAfter(newBlock);
        return newBlock;
    }

    collapseAtStart() {
        const paragraph = $createParagraphNode();
        const children = this.getChildren();
        children.forEach(child => paragraph.append(child));
        this.replace(paragraph);
        return true;
    }
}

function convertAsideElement() {
    const node = $createAsideNode;
    return {node};
}

export function $createAsideNode() {
    return new AsideNode();
}

export function $isAsideNode(node) {
    return node instanceof AsideNode;
}
