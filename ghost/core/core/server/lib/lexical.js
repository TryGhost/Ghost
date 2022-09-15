let lexicalHtmlRenderer;

module.exports = {
    get lexicalHtmlRenderer() {
        if (!lexicalHtmlRenderer) {
            const LexicalHtmlRenderer = require('@tryghost/kg-lexical-html-renderer');
            lexicalHtmlRenderer = new LexicalHtmlRenderer();
        }

        return lexicalHtmlRenderer;
    }
};
