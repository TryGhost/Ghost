import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function countCharacters(params) {
    if (!params || !params.length) {
        return;
    }

    let el = document.createElement('span');
    let content = params[0] || '';

    // convert to array so that we get accurate symbol counts for multibyte chars
    // this will still count emoji+modifer as two chars
    let {length} = Array.from(content);

    el.className = 'word-count';

    if (length > 180) {
        el.style.color = '#f05230';
    } else {
        el.style.color = '#45C32E';
    }

    el.innerHTML = 200 - length;

    return htmlSafe(el.outerHTML);
}

export default helper(function (params) {
    return countCharacters(params);
});
