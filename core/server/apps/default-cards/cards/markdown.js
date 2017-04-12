var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    jsdom       = require('jsdom').jsdom,
    Showdown    = require('showdown-ghost'),
    markdownConverter  = require('../../../utils/markdown-converter'),
    parser,
    sanitisedHTML;

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render(opts) {
            sanitisedHTML = jsdom(markdownConverter.makeHtml(opts.payload.markdown || '')).body.innerHTML;
            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);

            return parser.parse(''
                + '<div class="kg-card-markdown">'
                + sanitisedHTML
                + '</div>'
            );
        }
    };
