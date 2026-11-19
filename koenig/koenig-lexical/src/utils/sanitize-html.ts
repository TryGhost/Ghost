import DOMPurify from 'dompurify';

export function sanitizeHtml(html = '', options: {replaceJS?: boolean} = {}) {
    options = {
        ...{replaceJS: true},
        ...options
    };

    // replace script and iFrame
    if (options.replaceJS) {
        html = replaceEmbedsWithPlaceholders(html);
    }

    // sanitize html
    return DOMPurify.sanitize(html, {
        ALLOWED_URI_REGEXP: /^(?:https?:|\/|blob:)/,
        ADD_ATTR: ['id'],
        FORBID_TAGS: ['style']
    });
}

function replaceEmbedsWithPlaceholders(html: string) {
    const template = document.createElement('template');
    template.innerHTML = html;

    replaceElements(template, 'script', 'js-embed-placeholder', 'Embedded JavaScript');
    replaceElements(template, 'iframe', 'iframe-embed-placeholder', 'Embedded iFrame');

    return template.innerHTML;
}

function replaceElements(template: HTMLTemplateElement, selector: string, className: string, textContent: string) {
    template.content.querySelectorAll(selector).forEach((element) => {
        const placeholder = document.createElement('pre');
        placeholder.className = className;
        placeholder.textContent = textContent;

        element.replaceWith(placeholder);
    });
}
