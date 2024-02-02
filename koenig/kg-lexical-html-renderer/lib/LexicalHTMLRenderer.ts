import {SerializedEditorState, LexicalEditor, LexicalNode, Klass} from 'lexical';

import {createHeadlessEditor} from '@lexical/headless';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LinkNode} from '@lexical/link';
import $convertToHtmlString from './convert-to-html-string';
import getDynamicDataNodes from './get-dynamic-data-nodes';

interface RenderOptions {
    target?: 'html' | 'plaintext';
    dom?: import('jsdom').JSDOM;
    // TODO: we should define some standard here once we move to more cards with dynamic data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderData?: Map<number, any>;
}

export default class LexicalHTMLRenderer {
    dom: import('jsdom').JSDOM;
    nodes: Klass<LexicalNode>[];

    constructor({dom, nodes}: {dom?: import('jsdom').JSDOM, nodes?: Klass<LexicalNode>[]} = {}) {
        if (!dom) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const jsdom = require('jsdom');
            const {JSDOM} = jsdom;

            this.dom = new JSDOM();
        } else {
            this.dom = dom;
        }

        this.nodes = nodes || [];
    }

    async render(lexicalState: SerializedEditorState | string, userOptions: RenderOptions = {}) {
        const defaultOptions: RenderOptions = {
            target: 'html',
            dom: this.dom
        };
        const options = Object.assign({}, defaultOptions, userOptions);

        const DEFAULT_NODES: Array<Klass<LexicalNode>> = [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            LinkNode,
            ...this.nodes
        ];

        const editor: LexicalEditor = createHeadlessEditor({
            nodes: DEFAULT_NODES
        });

        const editorState = editor.parseEditorState(lexicalState);

        // gather nodes that require dynamic data
        const dynamicDataNodes = getDynamicDataNodes(editorState);

        // fetch dynamic data
        const renderData = new Map();
        await Promise.all(dynamicDataNodes.map(async (node: LexicalNode) => {
            const {key, data} = await node.getDynamicData(options);
            renderData.set(key, data);
        }));

        options.renderData = renderData;

        // render nodes
        editor.setEditorState(editorState);
        let html = '';

        editor.update(async () => {
            html = $convertToHtmlString(options);
        });

        return html;
    }
}
