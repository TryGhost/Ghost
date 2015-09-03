import Ember from 'ember';

export default Ember.Helper.helper(function (params) {
    var el = document.createElement('span'),
        length,
        content;

    if (!params || !params.length) {
        return;
    }

    content = params[0] || '';
    length = content.length;

    el.className = 'word-count';

    if (length > 180) {
        el.style.color = '#E25440';
    } else {
        el.style.color = '#9E9D95';
    }

    el.innerHTML = 200 - length;

    return Ember.String.htmlSafe(el.outerHTML);
});
