import {helper} from '@ember/component/helper';
import {isArray} from '@ember/array';

export function cleanBasicHtml(html = '') {
    if (isArray(html)) {
        html = html[0] || '';
    }

    let cleanHtml = html
        .replace(/<br>/g, ' ')
        .replace(/(\s|&nbsp;){2,}/g, ' ')
        .trim()
        .replace(/^&nbsp;|&nbsp$/g, '')
        .trim();

    // remove any elements that have a blank textContent
    if (cleanHtml) {
        let doc = new DOMParser().parseFromString(cleanHtml, 'text/html');

        doc.body.querySelectorAll('*').forEach((element) => {
            if (!element.textContent.trim()) {
                if (element.textContent.length > 0) {
                    // keep a single space to avoid collapsing spaces
                    let space = document.createTextNode(' ');
                    element.replaceWith(space);
                } else {
                    element.remove();
                }
            }
        });

        cleanHtml = doc.body.innerHTML;
    }

    return cleanHtml;
}

export default helper(cleanBasicHtml);
