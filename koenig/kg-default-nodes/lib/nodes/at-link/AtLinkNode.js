/* eslint-disable ghost/filenames/match-exported-class */
import {$applyNodeReplacement, ElementNode} from 'lexical';
import linkSVG from './kg-link.svg';
// Container element for a link search query. Temporary node used only inside
// the editor that will be replaced with a LinkNode when the search is complete.
export class AtLinkNode extends ElementNode {
    // We keep track of the format that was applied to the original '@' character
    // so we can re-apply that when converting to a LinkNode
    __linkFormat = null;

    static getType() {
        return 'at-link';
    }

    constructor(linkFormat, key) {
        super(key);
        this.__linkFormat = linkFormat;
    }

    static clone(node) {
        return new AtLinkNode(node.__linkFormat, node.__key);
    }

    // This is a temporary node, it should never be serialized but we need
    // to implement just in case and to match expected types. The AtLinkPlugin
    // should take care of replacing this node with it's children when needed.
    static importJSON({linkFormat}) {
        return $createAtLinkNode(linkFormat);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'at-link',
            version: 1,
            linkFormat: this.__linkFormat
        };
    }

    createDOM(config) {
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

    // should not render anything - this is a placeholder node
    exportDOM() {
        return null;
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

    setLinkFormat(linkFormat) {
        const self = this.getWritable();
        self.__linkFormat = linkFormat;
    }

    getLinkFormat() {
        const self = this.getLatest();
        return self.__linkFormat;
    }
}

export function $createAtLinkNode(linkFormat) {
    return $applyNodeReplacement(new AtLinkNode(linkFormat));
}

export function $isAtLinkNode(node) {
    return node instanceof AtLinkNode;
}
