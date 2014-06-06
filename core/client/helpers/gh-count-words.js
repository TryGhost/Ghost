import counter from 'ghost/utils/word-count';

var countWords = Ember.Handlebars.makeBoundHelper(function (markdown) {
    if (/^\s*$/.test(markdown)) {
        return '0 words';
    }

    var count = counter(markdown || '');
    return count + (count === 1 ? ' word' : ' words');
});

export default countWords;