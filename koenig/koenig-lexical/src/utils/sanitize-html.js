import cajaHtmlSanitize from './caja-sanitizer-bundle';
import cajaSanitizers from '../utils/caja-sanitizers';

export function sanitizeHtml(html, options = {}) {
    options = {
        ...{replaceJS: true},
        ...options
    };

    // replace script and iFrame
    if (options.replaceJS) {
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
    }

    // sanitize html
    return cajaHtmlSanitize(html, cajaSanitizers.url, cajaSanitizers.id);
}
