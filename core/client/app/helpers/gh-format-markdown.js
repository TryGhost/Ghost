/* global html_sanitize*/
import Ember from 'ember';
import cajaSanitizers from 'ghost/utils/caja-sanitizers';
import markdownit from 'npm:markdown-it';
import markdownitFootnote from 'npm:markdown-it-footnote';
import markdownitAnchor from 'npm:markdown-it-anchor';
import markdownitMark from 'npm:markdown-it-mark';
import markdownitUpload from 'npm:markdown-it-ghost-upload';

const {Helper} = Ember;

const md = markdownit({
  html:        true,
  linkify:     true,
  typographer: true,
  breaks:      true,
}).use(markdownitFootnote)
  .use(markdownitAnchor)
  .use(markdownitMark)
  .use(markdownitUpload);

export default Helper.helper(function (params) {
    if (!params || !params.length) {
        return;
    }

    let markdown = params[0] || '';
    let escapedhtml = '';

    // convert markdown to HTML
    escapedhtml = md.render(markdown);

    // replace script and iFrame
    escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');

    // sanitize html
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    return Ember.String.htmlSafe(escapedhtml);
});
