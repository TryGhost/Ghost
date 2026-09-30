import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function countDownCharacters(params) {
    if (!params || params.length < 2) {
        return;
    }

    const el = document.createElement('span');
    const [content, maxCharacters] = params;

    // convert to array so that we get accurate symbol counts for multibyte chars
    // this will still count emoji+modifer as two chars
    const {length} = Array.from(content || '');

    el.className = 'word-count';

    if (length > maxCharacters) {
        el.style.color = '#E25440';
        el.style.fontWeight = 'bold';
    } else {
        el.style.color = '#30CF43';
        el.style.fontWeight = 'bold';
    }

    el.innerHTML = length;

    return htmlSafe(el.outerHTML);
}

export default helper(function (params) {
    return countDownCharacters(params);
});
