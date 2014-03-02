/* global Showdown, Handlebars */
var showdown = new Showdown.converter();

export default Ember.Handlebars.makeBoundHelper(function(markdown) {
  return new Handlebars.SafeString(showdown.makeHtml(markdown));
});