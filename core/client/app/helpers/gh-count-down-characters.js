import Ember from 'ember';

const {Helper} = Ember;

export default Helper.helper(function (params) {
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

    return Ember.String.htmlSafe(el.outerHTML);
});
