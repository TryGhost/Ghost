/* jshint ignore:start */
// this has to be a node style module as it's imported by the front end and ember.
// a card has to have an editor object, and an HTML object. In the future we might have AMP and Text (for FTS) renderers.

var Showdown        = require('showdown-ghost'),
    converter        = new Showdown.converter({extensions: ['ghostgfm', 'footnotes', 'highlight']});


module.exports = {
    name: 'markdown-card',
    render: function(opts) {
        return converter.makeHtml(opts.payload.markdown || "");
    }
};

/* jshint ignore:end */
