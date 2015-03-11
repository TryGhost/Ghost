// # Title Helper
// Usage: `{{title}}`
//
// Overrides the standard behaviour of `{[title}}` to ensure the content is correctly escaped

var hbs             = require('express-hbs'),
    title;

title = function () {
    return new hbs.handlebars.SafeString(hbs.handlebars.Utils.escapeExpression(this.title || ''));
};

module.exports = title;
