const MarkdownIt = require('markdown-it');

const markdownIt = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true
})
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-lazy-headers'))
    .use(require('markdown-it-mark'))
    .use(function namedHeaders(md) {
        // match legacy Showdown IDs
        const slugify = function (inputString, usedHeaders) {
            let slug = inputString.replace(/[^\w]/g, '').toLowerCase();
            if (usedHeaders[slug]) {
                usedHeaders[slug] += 1;
                slug += usedHeaders[slug];
            }
            return slug;
        };
        const originalHeadingOpen = md.renderer.rules.heading_open;

        // originally from https://github.com/leff/markdown-it-named-headers
        // moved here to avoid pulling in http://stringjs.com dependency
        md.renderer.rules.heading_open = function (tokens, idx, something, somethingelse, self) {
            const usedHeaders = {};

            tokens[idx].attrs = tokens[idx].attrs || [];

            const title = tokens[idx + 1].children.reduce(function (acc, t) {
                return acc + t.content;
            }, '');

            const slug = slugify(title, usedHeaders);
            tokens[idx].attrs.push(['id', slug]);

            if (originalHeadingOpen) {
                return originalHeadingOpen.apply(this, arguments);
            } else {
                return self.renderToken.apply(self, arguments);
            }
        };
    });

// configure linkify-it
markdownIt.linkify.set({
    fuzzyLink: false
});

module.exports = {
    render: function (markdown) {
        return markdownIt.render(markdown);
    }
};
