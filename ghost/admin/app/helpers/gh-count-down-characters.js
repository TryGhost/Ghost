import {helper} from 'ember-helper';
import {htmlSafe} from 'ember-string';

export default helper(function (params) {
    if (!params || params.length < 2) {
        return;
    }

    let el = document.createElement('span');
    let [content, maxCharacters] = params;
    let length;

    content = content || '';
    length = content.length;

    el.className = 'word-count';

    if (length > maxCharacters) {
        el.style.color = '#E25440';
    } else {
        el.style.color = '#9FBB58';
    }

    el.innerHTML = length;

    return htmlSafe(el.outerHTML);
});
