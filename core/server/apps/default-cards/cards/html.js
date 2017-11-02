var SimpleDom = require('simple-dom'),
    tokenizer = require('simple-html-tokenizer').tokenize,
    parser;

module.exports = {
    name: 'card-html',
    type: 'dom',
    render(opts) {
        parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
        return parser.parse('<div class="kg-card-html">' + opts.payload.html + '</div>');
    }
};
