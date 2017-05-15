var SimpleDom   = require('simple-dom'),
    tokenizer   = require('simple-html-tokenizer').tokenize,
    JSDOM       = require('jsdom').JSDOM,
    markdownConverter  = require('../../../utils/markdown-converter');

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render(opts) {
            // markdown can be autosaved at any point by the client, even when
            // writing HTML so you can end up with unbalanced HTML elements
            //
            // mobiledoc uses simple-dom to build a DOM object. simple-dom is
            // purposefully very basic and only designed to handle valid HTML,
            // if it's fed unbalanced or invalid HTML it will throw an error.
            //
            // to work around the possibility of having invalid HTML we first
            // pass the HTML through jsdom which seeks to fully emulate the
            // WHATWG DOM/HTML standards including the ability to handle
            // unbalanced HTML in the same way a browser does

            var html = markdownConverter.render(opts.payload.markdown || ''),
                dom = new JSDOM(html),
                parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap),
                sanitisedHTML;

            // dom.serialize() will return an entire HTML doc including doctype
            // etc but we only want the rendered + sanitized HTML
            sanitisedHTML = dom.window.document.documentElement.innerHTML;

            // generate a new SimpleDom object from the sanitzed HTML
            return parser.parse(''
                + '<div class="kg-card-markdown">'
                + sanitisedHTML
                + '</div>'
            );
        }
    };
