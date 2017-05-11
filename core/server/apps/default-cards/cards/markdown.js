var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    MarkdownIt  = require('markdown-it'),
    converter,
    parser;

converter = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true
})
.use(require('markdown-it-footnote'))
.use(require('markdown-it-mark'));

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render(opts) {
            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
            return parser.parse(''
                + '<div class="kg-card-markdown">'
                + converter.render(opts.payload.markdown || '')
                + '</div>'
            );
        }
    };
