/* global html_sanitize*/
import cajaSanitizers from 'ghost-admin/utils/caja-sanitizers';
import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/string';

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
    /* eslint-disable camelcase */
    escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
    /* eslint-enable camelcase */

    return htmlSafe(escapedhtml);
});
