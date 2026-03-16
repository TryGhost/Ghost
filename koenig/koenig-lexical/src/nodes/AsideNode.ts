import {
    $createParagraphNode
} from 'lexical';
import {AsideNode as BaseAsideNode} from '@tryghost/kg-default-nodes';
import {
    addClassNamesToElement
} from '@lexical/utils';
import type {EditorConfig, LexicalNode, RangeSelection} from 'lexical';

export class AsideNode extends BaseAsideNode {
    createDOM(config: EditorConfig): HTMLElement {
        const element = document.createElement('aside');
        addClassNamesToElement(element, config.theme.aside);
        return element;
    }

    // Mutation

    insertNewAfter(_selection: RangeSelection, _restoreSelection?: boolean): LexicalNode {
        const newBlock = $createParagraphNode();
        const direction = this.getDirection();
        newBlock.setDirection(direction);
        this.insertAfter(newBlock);
        return newBlock;
    }

    collapseAtStart(): boolean {
        const paragraph = $createParagraphNode();
        const children = this.getChildren();
        children.forEach(child => paragraph.append(child));
        this.replace(paragraph);
        return true;
    }
}

export function $createAsideNode(): AsideNode {
    return new AsideNode();
}

export function $isAsideNode(node: unknown): node is AsideNode {
    return node instanceof AsideNode;
}
