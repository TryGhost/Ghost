import {$applyNodeReplacement, TextNode} from 'lexical';
import type {EditorConfig} from 'lexical';

// Represents the search query string inside an AtLinkNode. Used in place of a
// regular TextNode to allow for :after styling to be applied to work as a placeholder
export class AtLinkSearchNode extends TextNode {
    __placeholder: string | null = null;

    defaultPlaceholder = 'Find a post, tag or author';

    static getType() {
        return 'at-link-search';
    }

    constructor(text: string, placeholder: string | null, key?: string) {
        super(text, key);
        this.__placeholder = placeholder;
    }

    static clone(node: AtLinkSearchNode) {
        return new AtLinkSearchNode(
            node.__text,
            node.__placeholder,
            node.__key
        );
    }

    // This is a temporary node, it should never be serialized but we need
    // to implement just in case and to match expected types. The AtLinkPlugin
    // should take care of replacing this node when needed.
    static importJSON(serializedNode: ReturnType<AtLinkSearchNode['exportJSON']>) {
        return $createAtLinkSearchNode(serializedNode.text, serializedNode.placeholder);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'at-link-search',
            version: 1,
            placeholder: this.__placeholder
        };
    }

    createDOM(config: EditorConfig) {
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

    updateDOM(prevNode: AtLinkSearchNode, dom: HTMLElement, config: EditorConfig) {
        dom.dataset.placeholder = this.__placeholder !== null
            ? this.__placeholder
            : this.__text
                ? ''
                : this.defaultPlaceholder;

        return super.updateDOM(prevNode, dom, config);
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

    canHaveFormat() {
        return false;
    }

    setPlaceholder(text: string | null) {
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

export function $createAtLinkSearchNode(text = '', placeholder: string | null = null): AtLinkSearchNode {
    return $applyNodeReplacement(new AtLinkSearchNode(text, placeholder));
}

export function $isAtLinkSearchNode(node: unknown): node is AtLinkSearchNode {
    return node instanceof AtLinkSearchNode;
}
