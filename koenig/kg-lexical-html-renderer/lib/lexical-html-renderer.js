class LexicalHTMLRenderer {
    render(lexicalState, userOptions = {}) {
        const {createHeadlessEditor} = require('@lexical/headless');
        const {HeadingNode} = require('@lexical/rich-text');
        const {$convertToHtmlString} = require('./convert-to-html-string');

        const defaultOptions = {
            target: 'html'
        };
        const options = Object.assign({}, defaultOptions, userOptions);

        const DEFAULT_NODES = [
            HeadingNode
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
