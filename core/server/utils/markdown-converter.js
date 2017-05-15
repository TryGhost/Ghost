var MarkdownIt  = require('markdown-it'),
    converter = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
    })
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-lazy-headers'))
    .use(require('markdown-it-mark'))
    .use(require('markdown-it-named-headers'), {
        // match legacy Showdown IDs otherwise default is github style dasherized
        slugify: function (inputString, usedHeaders) {
            var slug = inputString.replace(/[^\w]/g, '').toLowerCase();
            if (usedHeaders[slug]) {
                usedHeaders[slug] += 1;
                slug += usedHeaders[slug];
            }
            return slug;
        }
    });

module.exports = {
    render: function (markdown) {
        return converter.render(markdown);
    }
};
