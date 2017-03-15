var SimpleDom   = require('simple-dom'),
    jsdom       = require('jsdom').jsdom,
    tokenizer   = require('simple-html-tokenizer').tokenize,
    parser;

module.exports = {
        name: 'card-html',
        type: 'dom',
        render(opts) {
            // two stage import, firstly we import the raw payload into JSDOM to generate correct HTML.
            var sanitisedHTML = jsdom(opts.payload.html).body.innerHTML;

            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);
            return parser.parse('<div>' + sanitisedHTML + '</div>');
        }
    };
