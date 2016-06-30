/* global html_sanitize*/
import {helper} from 'ember-helper';
import {htmlSafe} from 'ember-string';
import cajaSanitizers from 'ghost-admin/utils/caja-sanitizers';

export default helper(function (params) {
    if (!params || !params.length) {
        return;
    }

    let escapedhtml = params[0] || '';

    // replace script and iFrame
    escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');

    // sanitize HTML
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    return htmlSafe(escapedhtml);
});
