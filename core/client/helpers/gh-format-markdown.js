/* global Showdown, Handlebars */
var showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm']});

var formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
    return new Handlebars.SafeString(showdown.makeHtml(markdown || ''));
});

export default formatMarkdown;