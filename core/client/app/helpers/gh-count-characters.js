import Ember from 'ember';
var countCharacters = Ember.HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
    var el = document.createElement('span'),
        length,
        content;

    if (!arr || !arr.length) {
        return;
    }

    content = arr[0] || '';
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

export default countCharacters;
