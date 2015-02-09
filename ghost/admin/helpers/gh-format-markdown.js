/* global Showdown, html_sanitize*/
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var showdown,
    formatMarkdown;

showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm', 'footnotes', 'highlight']});

formatMarkdown = Ember.HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
    if (!arr || !arr.length) {
        return;
    }

    var escapedhtml = '',
        markdown = arr[0] || '';

    // convert markdown to HTML
    escapedhtml = showdown.makeHtml(markdown);

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

export default formatMarkdown;
