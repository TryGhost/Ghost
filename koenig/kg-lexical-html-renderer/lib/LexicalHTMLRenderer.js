class LexicalHTMLRenderer {
    constructor({dom, nodes} = {}) {
        if (!dom) {
            const jsdom = require('jsdom');
            const {JSDOM} = jsdom;

            this.dom = new JSDOM();
        } else {
            this.dom = dom;
        }

        this.nodes = nodes || [];
    }

    async render(lexicalState, userOptions = {}) {
        const {createHeadlessEditor} = require('@lexical/headless');
        const {ListItemNode, ListNode} = require('@lexical/list');
        const {HeadingNode, QuoteNode} = require('@lexical/rich-text');
        const {LinkNode} = require('@lexical/link');
        const {$convertToHtmlString} = require('./convert-to-html-string');
        const {getDynamicDataNodes} = require('./get-dynamic-data-nodes');

        const defaultOptions = {
            target: 'html',
            dom: this.dom
        };
        const options = Object.assign({}, defaultOptions, userOptions);

        const DEFAULT_NODES = [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            LinkNode,
            ...this.nodes
        ];

        const editor = createHeadlessEditor({
            nodes: DEFAULT_NODES
        });

        const editorState = editor.parseEditorState(lexicalState);

        // gather nodes that require dynamic data
        const dynamicDataNodes = getDynamicDataNodes(editorState);

        // fetch dynamic data
        let renderData = new Map();
        await Promise.all(dynamicDataNodes.map(async (node) => {
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

module.exports = LexicalHTMLRenderer;
