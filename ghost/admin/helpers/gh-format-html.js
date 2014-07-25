/* global Handlebars, html_sanitize*/
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var formatHTML = Ember.Handlebars.makeBoundHelper(function (html) {
    var escapedhtml = html || '';

    // replace script and iFrame
    escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre><code>Embedded JavaScript</code></pre>');
    escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre><code>Embedded IFrame</code></pre>');

    // sanitize HTML
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    return new Handlebars.SafeString(escapedhtml);
});

export default formatHTML;