var markdownConverter  = require('../../../utils/markdown-converter');

module.exports = {
        name: 'card-markdown',
        type: 'dom',
        render: function (opts) {
            var SimpleDom   = require('simple-dom'),
                tokenizer   = require('simple-html-tokenizer').tokenize,
                jsdom       = require('jsdom').jsdom,
                html, doc, parser, sanitizedHTML;

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
            html = markdownConverter.render(opts.payload.markdown || '');
            doc = jsdom(html, {
                features: {
                    FetchExternalResources: false,
                    ProcessExternalResources: false
                }
            });

            // grab the rendered + sanitized body HTML
            sanitizedHTML = doc.body.innerHTML;

            // free up memory by closing the jsdom "window"
            doc.defaultView.close();

            parser = new SimpleDom.HTMLParser(tokenizer, opts.env.dom, SimpleDom.voidMap);

            // generate a new SimpleDom object from the sanitzed HTML
            return parser.parse(''
                + '<div class="kg-card-markdown">'
                + sanitizedHTML
                + '</div>'
            );
        }
    };
