import {helper} from '@ember/component/helper';
import {isArray} from '@ember/array';

export function cleanBasicHtml(html = '') {
    if (isArray(html)) {
        html = html[0];
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
                element.remove();
            }
        });

        cleanHtml = doc.body.innerHTML;
    }

    return cleanHtml;
}

export default helper(cleanBasicHtml);
