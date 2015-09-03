import Ember from 'ember';

export default Ember.Helper.helper(function (params) {
    var el = document.createElement('span'),
        content,
        maxCharacters,
        length;

    if (!params || params.length < 2) {
        return;
    }

    content = params[0] || '';
    maxCharacters = params[1];
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
