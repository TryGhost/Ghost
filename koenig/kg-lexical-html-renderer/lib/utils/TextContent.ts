import {$isLinkNode, LinkNode} from '@lexical/link';
import {$isTextNode, $isLineBreakNode, TextNode} from 'lexical';
import type {ElementNode, LexicalNode, TextFormatType} from 'lexical';
import type {RendererOptions} from '@tryghost/kg-default-nodes';

type TextFormatAbbreviation = 'STRONG' | 'EM' | 'S' | 'U' | 'CODE' | 'SUB' | 'SUP' | 'MARK';
type ExportChildren = (node: ElementNode, options: RendererOptions) => string;

const FORMAT_TAG_MAP: Record<TextFormatType, TextFormatAbbreviation> = {
    bold: 'STRONG',
    italic: 'EM',
    strikethrough: 'S',
    underline: 'U',
    code: 'CODE',
    subscript: 'SUB',
    superscript: 'SUP',
    highlight: 'MARK'
};

type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

type RequiredKeys<T, K extends keyof T> = Exclude<T, K> & Required<Pick<T, K>>

const ensureDomProperty = (options: RendererOptions): options is RequiredKeys<RendererOptions, 'dom'> => {
    return !!options.dom;
};

// Builds and renders text content, useful to ensure proper format tag opening/closing
// and html escaping
export default class TextContent {
    nodes: LexicalNode[];
    exportChildren: ExportChildren;
    options: RequiredKeys<RendererOptions, 'dom'>;

    constructor(exportChildren: ExportChildren, options: RendererOptions) {
        /* c8 ignore next 4 */
        if (ensureDomProperty(options) === false) {
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error('TextContent requires a dom property in the options argument');
        }
        this.exportChildren = exportChildren;
        this.options = options as RequiredKeys<RendererOptions, 'dom'>;

        this.nodes = [];
    }

    addNode(node: LexicalNode): void {
        this.nodes.push(node);
    }

    render(): string {
        const document: Document = this.options.dom.window.document;
        const root: HTMLElement = document.createElement('div');

        let currentNode = root;
        const openFormats: TextFormatType[] = [];

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];

            if ($isLineBreakNode(node)) {
                currentNode.append(document.createElement('BR'));
                continue;
            }

            if ($isLinkNode(node)) {
                const anchor = document.createElement('A');
                this._buildAnchorElement(anchor, node);
                currentNode.append(anchor);
                continue;
            }

            if ($isTextNode(node)) {
                // shortcut format code for plain text
                if (node.getFormat() === 0) {
                    currentNode.append(node.getTextContent());
                    continue;
                }

                // open format tags in correct order
                const formatsToOpen: TextFormatType[] = [];

                // get base list of formats that need to open
                (Object.entries(FORMAT_TAG_MAP) as Entries<typeof FORMAT_TAG_MAP>).forEach(([format]) => {
                    if (node.hasFormat(format) && !openFormats.includes(format)) {
                        formatsToOpen.push(format);
                    }
                });

                // re-order formats to open based on next nodes - we want to make
                // sure tags that will be kept open for later nodes are opened first
                const remainingNodes = this.nodes.slice(i + 1);
                // avoid checking any nodes after a link node because those cause all formats to close
                const nextLinkNodeIndex = remainingNodes.findIndex(n => $isLinkNode(n));
                const remainingSortNodes = nextLinkNodeIndex === -1 ? remainingNodes : remainingNodes.slice(0, nextLinkNodeIndex);

                // ensure we're only working with text nodes as they're the only ones that can open/close formats
                const remainingSortedTextNodes = remainingSortNodes.filter(n => $isTextNode(n)) as TextNode[];

                formatsToOpen.sort((a, b) => {
                    const aIndex = remainingSortedTextNodes.findIndex(n => n.hasFormat(a));
                    const bIndex = remainingSortedTextNodes.findIndex(n => n.hasFormat(b));

                    if (aIndex === -1) {
                        return 1;
                    }
                    if (bIndex === -1) {
                        return -1;
                    }
                    /* c8 ignore next 1 */
                    return aIndex - bIndex;
                });

                // open new tags
                formatsToOpen.forEach((format) => {
                    const formatTag = document.createElement(FORMAT_TAG_MAP[format]);
                    currentNode.append(formatTag);
                    currentNode = formatTag;
                    openFormats.push(format);
                });

                // insert text
                currentNode.append(node.getTextContent());

                // close tags in correct order if next node doesn't have the format
                // links are their own formatting islands so all formats need to close before a link
                const nextNode = remainingNodes.find(n => $isTextNode(n) || $isLinkNode(n));
                [...openFormats].forEach((format) => {
                    if (!nextNode || $isLinkNode(nextNode) || (nextNode instanceof TextNode && !nextNode.hasFormat(format))) {
                        currentNode = currentNode.parentNode as HTMLElement;
                        openFormats.pop();
                    }
                });

                continue;
            }
        }

        return root.innerHTML;
    }

    isEmpty() {
        return this.nodes.length === 0;
    }

    clear() {
        this.nodes = [];
    }

    // PRIVATE -----------------------------------------------------------------

    _buildAnchorElement(anchor: HTMLElement, node: LinkNode) {
        // Only set the href if we have a URL, otherwise we get a link to the current page
        if (node.getURL()) {
            anchor.setAttribute('href', node.getURL());
        }
        if (node.getRel()) {
            anchor.setAttribute('rel', node.getRel() || '');
        }
        anchor.innerHTML = this.exportChildren(node, this.options);
    }
}
