/* eslint-disable ghost/filenames/match-exported-class */
import {$applyNodeReplacement, TextNode} from 'lexical';

// Represents the search query string inside an AtLinkNode. Used in place of a
// regular TextNode to allow for :after styling to be applied to work as a placeholder
export class AtLinkSearchNode extends TextNode {
    __placeholder = null;

    defaultPlaceholder = 'Find a post, tag or author';

    static getType() {
        return 'at-link-search';
    }

    constructor(text, placeholder, key) {
        super(text, key);
        this.__placeholder = placeholder;
    }

    static clone(node) {
        return new AtLinkSearchNode(
            node.__text,
            node.__placeholder,
            node.__key
        );
    }

    // This is a temporary node, it should never be serialized but we need
    // to implement just in case and to match expected types. The AtLinkPlugin
    // should take care of replacing this node when needed.
    static importJSON({text, placeholder}) {
        return $createAtLinkSearchNode(text, placeholder);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'at-link-search',
            version: 1,
            placeholder: this.__placeholder
        };
    }

    createDOM(config) {
        const span = super.createDOM(config);
        span.dataset.placeholder = '';
        if (!this.__text) {
            span.dataset.placeholder =
                this.__placeholder ?? this.defaultPlaceholder;
        } else {
            span.dataset.placeholder = this.__placeholder || '';
        }
        span.classList.add(...config.theme.atLinkSearch.split(' '));

        return span;
    }

    updateDOM(prevNode, dom) {
        if (this.__text) {
            dom.dataset.placeholder = this.__placeholder ?? '';
        }

        return super.updateDOM(...arguments);
    }

    // should not render anything - this is a placeholder node
    exportDOM() {
        return null;
    }

    /* c8 ignore next 3 */
    static importDOM() {
        return null;
    }

    canHaveFormat() {
        return false;
    }

    setPlaceholder(text) {
        const self = this.getWritable();
        self.__placeholder = text;
    }

    getPlaceholder() {
        const self = this.getLatest();
        return self.__placeholder;
    }

    // Lexical will incorrectly pick up this node as an element node when the
    // cursor is placed by the SVG icon element in the parent AtLinkNode. We
    // need these methods to avoid throwing errors in that case but otherwise
    // behaviour is unaffected.
    getChildrenSize() {
        return 0;
    }

    getChildAtIndex() {
        return null;
    }
}

export function $createAtLinkSearchNode(text = '', placeholder = null) {
    return $applyNodeReplacement(new AtLinkSearchNode(text, placeholder));
}

export function $isAtLinkSearchNode(node) {
    return node instanceof AtLinkSearchNode;
}
