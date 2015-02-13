var countDownCharacters = Ember.HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
    var el = document.createElement('span'),
        content,
        maxCharacters,
        length;

    if (!arr || arr.length < 2) {
        return;
    }

    content = arr[0] || '';
    maxCharacters = arr[1];
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

export default countDownCharacters;
