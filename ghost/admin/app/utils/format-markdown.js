/* global html_sanitize */
import cajaSanitizers from './caja-sanitizers';
import markdownit from 'npm:markdown-it';
import markdownitFootnote from 'npm:markdown-it-footnote';
import markdownitLazyHeaders from 'npm:markdown-it-lazy-headers';
import markdownitMark from 'npm:markdown-it-mark';
import markdownitNamedHeaders from 'npm:markdown-it-named-headers';

// eslint-disable-next-line new-cap
let md = markdownit({
    html: true,
    breaks: true,
    linkify: true
})
.use(markdownitFootnote)
.use(markdownitLazyHeaders)
.use(markdownitMark)
.use(markdownitNamedHeaders, {
    // match legacy Showdown IDs otherwise default is github style dasherized
    slugify(inputString, usedHeaders) {
        let slug = inputString.replace(/[^\w]/g, '').toLowerCase();
        if (usedHeaders[slug]) {
            usedHeaders[slug]++;
            slug += usedHeaders[slug];
        }
        return slug;
    }
});

export default function formatMarkdown(_markdown, replaceJS = true) {
    let markdown = _markdown || '';
    let escapedhtml = '';

    // convert markdown to HTML
    escapedhtml = md.render(markdown);

    // replace script and iFrame
    if (replaceJS) {
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
    }

    // sanitize html
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);

    return escapedhtml;
}
