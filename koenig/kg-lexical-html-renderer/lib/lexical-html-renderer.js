class LexicalHTMLRenderer {
    constructor({nodes} = {}) {
        const jsdom = require('jsdom');
        const {JSDOM} = jsdom;

        this.dom = new JSDOM();
        this.nodes = nodes || [];
    }

    async render(lexicalState, userOptions = {}) {
        const {createHeadlessEditor} = require('@lexical/headless');
        const {ListItemNode, ListNode} = require('@lexical/list');
        const {HeadingNode, QuoteNode} = require('@lexical/rich-text');
        const {LinkNode} = require('@lexical/link');
        const {$convertToHtmlString} = require('./convert-to-html-string');

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

        editor.setEditorState(editor.parseEditorState(lexicalState));

        let html = '';

        editor.update(() => {
            html = $convertToHtmlString(options);
        });

        return html;
    }
}

module.exports = LexicalHTMLRenderer;
