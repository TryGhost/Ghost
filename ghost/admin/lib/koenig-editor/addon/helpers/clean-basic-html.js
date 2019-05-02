import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {helper} from '@ember/component/helper';
import {isArray} from '@ember/array';

export function cleanBasicHtmlHelper(html = '') {
    if (isArray(html)) {
        html = html[0] || '';
    }

    return cleanBasicHtml(html);
}

export default helper(cleanBasicHtmlHelper);
