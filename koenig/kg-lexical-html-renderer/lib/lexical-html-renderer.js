class LexicalHTMLRenderer {
    render(lexicalState, userOptions = {}) {
        const {createHeadlessEditor} = require('@lexical/headless');
        const {ListItemNode, ListNode} = require('@lexical/list');
        const {HeadingNode, QuoteNode} = require('@lexical/rich-text');
        const {CodeNode} = require('@lexical/code');
        const {LinkNode} = require('@lexical/link');
        const {HorizontalRuleNode} = require('./nodes/HorizontalRuleNode');
        const {AsideNode} = require('./nodes/AsideNode');
        const {$convertToHtmlString} = require('./convert-to-html-string');

        const defaultOptions = {
            target: 'html'
        };
        const options = Object.assign({}, defaultOptions, userOptions);

        const DEFAULT_NODES = [
            HeadingNode,
            ListNode,
            ListItemNode,
            QuoteNode,
            AsideNode,
            LinkNode,
            HorizontalRuleNode,
            CodeNode // TODO: replace with our own card
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
