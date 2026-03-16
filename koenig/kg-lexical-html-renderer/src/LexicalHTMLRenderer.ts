import {createHeadlessEditor} from '@lexical/headless';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import $convertToHtmlString from './convert-to-html-string.js';
import getDynamicDataNodes from './get-dynamic-data-nodes.js';
import {registerRemoveAtLinkNodesTransform} from '@tryghost/kg-default-transforms';
import type {SerializedEditorState, LexicalEditor, LexicalNode, Klass} from 'lexical';
import type {ExportDOMDom} from '@tryghost/kg-default-nodes';
import type {RendererOptions} from './types.js';

interface RenderOptions {
    target?: 'html' | 'email' | 'plaintext';
    dom?: ExportDOMDom;
    // TODO: we should define some standard here once we move to more cards with dynamic data
    renderData?: Map<number, unknown>;
}

function defaultOnError(error: Error) {
    void error;
    // do nothing
}

export default class LexicalHTMLRenderer {
    dom?: ExportDOMDom;
    nodes: Klass<LexicalNode>[];
    onError: (error: Error) => void;

    constructor({dom, nodes, onError}: {dom?: ExportDOMDom, nodes?: Klass<LexicalNode>[], onError?: (error: Error) => void} = {}) {
        this.dom = dom;
        this.nodes = nodes || [];
        this.onError = onError || defaultOnError;
    }

    async render(lexicalState: SerializedEditorState | string, userOptions: RenderOptions = {}) {
        const defaultOptions: RendererOptions = {
            target: 'html',
            dom: await this._getDefaultDom(userOptions.dom)
        };
        const options: RendererOptions = Object.assign({}, defaultOptions, userOptions);

        const DEFAULT_NODES: Array<Klass<LexicalNode>> = [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            LinkNode,
            ...this.nodes
        ];

        const editor: LexicalEditor = createHeadlessEditor({
            nodes: DEFAULT_NODES,
            onError: this.onError
        });

        const editorState = editor.parseEditorState(lexicalState);

        // gather nodes that require dynamic data
        const dynamicDataNodes = getDynamicDataNodes(editorState);

        // fetch dynamic data
        const renderData = new Map();
        await Promise.all(dynamicDataNodes.map(async (node) => {
            if (!node.getDynamicData) {
                return;
            }

            const {key, data} = await node.getDynamicData(options);
            renderData.set(key, data);
        }));

        options.renderData = renderData;

        // set up editor with our state
        editor.setEditorState(editorState);

        // register transforms that clean up state for rendering
        registerRemoveAtLinkNodesTransform(editor);

        // render
        let html = '';
        editor.update(async () => {
            html = $convertToHtmlString(options);
        });

        return html;
    }

    private async _getDefaultDom(dom?: ExportDOMDom): Promise<ExportDOMDom> {
        if (dom) {
            return dom;
        }

        if (this.dom) {
            return this.dom;
        }

        // JSDOM default is a Node-side convenience. Consumers in browser
        // environments can pass any {window: {document}}-shaped object.
        const {JSDOM} = await import('jsdom');

        this.dom = new JSDOM();

        return this.dom;
    }
}
