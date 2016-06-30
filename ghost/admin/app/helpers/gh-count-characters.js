import {helper} from 'ember-helper';
import {htmlSafe} from 'ember-string';

export default helper(function (params) {
    if (!params || !params.length) {
        return;
    }

    let el = document.createElement('span');
    let content = params[0] || '';
    let {length} = content;

    el.className = 'word-count';

    if (length > 180) {
        el.style.color = '#E25440';
    } else {
        el.style.color = '#9E9D95';
    }

    el.innerHTML = 200 - length;

    return htmlSafe(el.outerHTML);
});
