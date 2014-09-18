/* global Showdown, Handlebars, html_sanitize*/
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm']});

var formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
    var escapedhtml = '';

    // convert markdown to HTML
    escapedhtml = showdown.makeHtml(markdown || '');

    // replace script and iFrame
    escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');

    // sanitize html
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    return new Handlebars.SafeString(escapedhtml);
});

export default formatMarkdown;