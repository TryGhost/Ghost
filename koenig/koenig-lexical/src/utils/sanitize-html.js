import DOMPurify from 'dompurify';

export function sanitizeHtml(html = '', options = {}) {
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
    return DOMPurify.sanitize(html, {ALLOWED_URI_REGEXP: /^https?:|^\/|blob:/, ADD_ATTR: ['id']});
}
