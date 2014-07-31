/* global Showdown, Handlebars, html_sanitize*/
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm']});

var formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
    var html = '';

    // replace script and iFrame
    markdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    markdown = markdown.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');

    // convert markdown to HTML
    html = showdown.makeHtml(markdown || '');

    // sanitize html
    html = html_sanitize(html, cajaSanitizers.url, cajaSanitizers.id);
    return new Handlebars.SafeString(html);
});

export default formatMarkdown;