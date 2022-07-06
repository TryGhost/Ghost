/* global html_sanitize */
import cajaSanitizers from 'ghost-admin/utils/caja-sanitizers';
import {assign} from '@ember/polyfills';
import {helper} from '@ember/component/helper';
import {isArray} from '@ember/array';

export function sanitizeHtml(params, options = {}) {
    let html = isArray(params) ? params[0] : params;

    options = assign({replaceJS: true}, options);

    // replace script and iFrame
    if (options.replaceJS) {
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
    }

    // sanitize html
    return html_sanitize(html, cajaSanitizers.url, cajaSanitizers.id);
}

export default helper(sanitizeHtml);
