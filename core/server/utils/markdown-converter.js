var MarkdownIt  = require('markdown-it')

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
    slugify: function (input_string, used_headers) {
        var slug = input_string.replace(/[^\w]/g, '').toLowerCase();
        if (used_headers[slug]) {
            used_headers[slug]++;
            slug += used_headers[slug];
        }
        return slug;
    }
});

module.exports = {
    render: function (markdown) {
        return converter.render(markdown);
    }
}
