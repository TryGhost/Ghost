import {$applyNodeReplacement, ElementNode} from 'lexical';
import type {EditorConfig} from 'lexical';
const linkSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M13.54 10.46c2.2 2.2 2.2 5.61 0 7.81l-3.08 3.08c-2.2 2.2-5.61 2.2-7.81 0-2.2-2.2-2.2-5.61 0-7.81L5.4 10.9"/> <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M10.46 13.54c-2.2-2.2-2.2-5.61 0-7.81l3.08-3.08c2.2-2.2 5.61-2.2 7.81 0 2.2 2.2 2.2 5.61 0 7.81L18.6 13.1"/> </svg>';
// Container element for a link search query. Temporary node used only inside
// the editor that will be replaced with a LinkNode when the search is complete.
export class AtLinkNode extends ElementNode {
    // We keep track of the format that was applied to the original '@' character
    // so we can re-apply that when converting to a LinkNode
    __linkFormat: number | null = null;

    static getType() {
        return 'at-link';
    }

    constructor(linkFormat: number | null, key?: string) {
        super(key);
        this.__linkFormat = linkFormat;
    }

    static clone(node: AtLinkNode) {
        return new AtLinkNode(node.__linkFormat, node.__key);
    }

    // This is a temporary node, it should never be serialized but we need
    // to implement just in case and to match expected types. The AtLinkPlugin
    // should take care of replacing this node with it's children when needed.
    static importJSON(serializedNode: ReturnType<AtLinkNode['exportJSON']>) {
        return $createAtLinkNode(serializedNode.linkFormat);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'at-link',
            version: 1,
            linkFormat: this.__linkFormat
        };
    }

    createDOM(config: EditorConfig) {
        const span = document.createElement('span');
        const atLinkClasses = (config.theme.atLink || '').split(' ').filter(Boolean);
        const atLinkIconClasses = (config.theme.atLinkIcon || '').split(' ').filter(Boolean);

        span.classList.add(...atLinkClasses);

        const svgElement = new DOMParser().parseFromString(linkSVG, 'image/svg+xml').documentElement;
        svgElement.classList.add(...atLinkIconClasses);

        span.appendChild(svgElement);

        return span;
    }

    updateDOM() {
        return false;
    }

    // This is an editor-only placeholder node. Return an empty element and
    // `type: 'inner'` so downstream serializers emit no HTML while still
    // receiving a non-null DOM element.
    exportDOM() {
        const span = document.createElement('span');
        return {element: span, type: 'inner' as const};
    }

    /* c8 ignore next 3 */
    static importDOM() {
        return null;
    }

    getTextContent() {
        return '';
    }

    isInline() {
        return true;
    }

    canBeEmpty() {
        return false;
    }

    setLinkFormat(linkFormat: number | null) {
        const self = this.getWritable();
        self.__linkFormat = linkFormat;
    }

    getLinkFormat() {
        const self = this.getLatest();
        return self.__linkFormat;
    }
}

export function $createAtLinkNode(linkFormat: number | null = null): AtLinkNode {
    return $applyNodeReplacement(new AtLinkNode(linkFormat));
}

export function $isAtLinkNode(node: unknown): node is AtLinkNode {
    return node instanceof AtLinkNode;
}
