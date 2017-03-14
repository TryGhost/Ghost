var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    parser;

module.exports = {
        name: 'html-card',
        type: 'dom',
        render(opts) {
            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
            return parser.parse('<div>' + opts.payload.html + '</div>');
        }
    };
