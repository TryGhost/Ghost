import counter from 'ghost/utils/word-count';

var countWords = Ember.Handlebars.makeBoundHelper(function (markdown) {
    if (/^\s*$/.test(markdown)) {
        return '0 个字';
    }

    var count = counter(markdown || '');
    return count + (count === 1 ? ' 个字' : ' 个字');
});

export default countWords;