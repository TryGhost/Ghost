// # Amp Content Helper
// Usage: `{{amp_content}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Converts normal HTML into AMP HTML.

var hbs             = require('express-hbs'),
    ampContent;

ampContent = function () {
    // var root = options.data.root;
    // console.log('root:', root);
    return new hbs.handlebars.SafeString(this.html);
};

module.exports = ampContent;
