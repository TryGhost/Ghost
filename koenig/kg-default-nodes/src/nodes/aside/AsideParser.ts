import type {LexicalNode} from 'lexical';

export class AsideParser {
    NodeClass: {new (): LexicalNode};

    constructor(NodeClass: {new (): LexicalNode}) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        return {
            blockquote: () => ({
                conversion: (domNode: HTMLElement) => {
                    const isBigQuote = domNode.classList?.contains('kg-blockquote-alt');
                    if (domNode.tagName === 'BLOCKQUOTE' && isBigQuote) {
                        const node = new this.NodeClass();
                        return {node};
                    }

                    return null;
                },
                priority: 0 as const
            })
        };
    }
}
