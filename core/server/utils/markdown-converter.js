var MarkdownIt = require('markdown-it'),
    converter = new MarkdownIt({
        html: true,
        breaks: true,
        linkify: true
    })
        .use(require('markdown-it-footnote'))
        .use(require('markdown-it-lazy-headers'))
        .use(require('markdown-it-mark'))
        .use(function namedHeaders(md) {
            // match legacy Showdown IDs
            var slugify = function (inputString, usedHeaders) {
                var slug = inputString.replace(/[^\w]/g, '').toLowerCase();
                if (usedHeaders[slug]) {
                    usedHeaders[slug] += 1;
                    slug += usedHeaders[slug];
                }
                return slug;
            };
            var originalHeadingOpen = md.renderer.rules.heading_open;

            // originally from https://github.com/leff/markdown-it-named-headers
            // moved here to avoid pulling in http://stringjs.com dependency
            md.renderer.rules.heading_open = function (tokens, idx, something, somethingelse, self) {
                var usedHeaders = {};

                tokens[idx].attrs = tokens[idx].attrs || [];

                var title = tokens[idx + 1].children.reduce(function (acc, t) {
                    return acc + t.content;
                }, '');

                var slug = slugify(title, usedHeaders);
                tokens[idx].attrs.push(['id', slug]);

                if (originalHeadingOpen) {
                    return originalHeadingOpen.apply(this, arguments);
                } else {
                    return self.renderToken.apply(self, arguments);
                }
            };
        });

// configure linkify-it
converter.linkify.set({
    fuzzyLink: false
});

module.exports = {
    render: function (markdown) {
        return converter.render(markdown);
    }
};
