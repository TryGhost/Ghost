var countCharacters = Ember.Handlebars.makeBoundHelper(function (content) {
    var el = document.createElement('span'),
        length = content ? content.length : 0;

    el.className = 'word-count';
    if (length > 180) {
        el.style.color = '#E25440';
    } else {
        el.style.color = '#9E9D95';
    }

    el.innerHTML = 200 - length;

    return new Ember.Handlebars.SafeString(el.outerHTML);
});

export default countCharacters;