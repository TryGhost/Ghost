/* global html_sanitize*/
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var formatHTML = Ember.HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
    if (!arr || !arr.length) {
        return;
    }

    var escapedhtml = arr[0] || '';

    // replace script and iFrame
    escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');

    // sanitize HTML
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    return Ember.String.htmlSafe(escapedhtml);
});

export default formatHTML;
