var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    markdownConverter  = require('../../../utils/markdown-converter'),
    parser;

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render(opts) {
            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
            return parser.parse(''
                + '<div class="kg-card-markdown">'
                + markdownConverter.render(opts.payload.markdown || '')
                + '</div>'
            );
        }
    };
