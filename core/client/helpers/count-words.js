import count from "ghost/utils/word-counter";

export default Ember.Handlebars.makeBoundHelper(function(markdown) {
  return count(markdown);
});