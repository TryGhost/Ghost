import count from "ghost/utils/word-count";

var countWords = Ember.Handlebars.makeBoundHelper(function(markdown) {
    return count(markdown);
});

export default countWords;