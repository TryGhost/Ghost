class LexicalHTMLRenderer {
    render(lexicalState, userOptions = {}) {
        const {createHeadlessEditor} = require('@lexical/headless');
        const {$convertToHtmlString} = require('./convert-to-html-string');

        const defaultOptions = {
            target: 'html'
        };
        const options = Object.assign({}, defaultOptions, userOptions);

        const editor = createHeadlessEditor({
            nodes: []
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
