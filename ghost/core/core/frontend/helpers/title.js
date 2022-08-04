// # Title Helper
// Usage: `{{title}}`
//
// Overrides the standard behavior of `{[title}}` to ensure the content is correctly escaped

const {SafeString, escapeExpression} = require('../services/handlebars');

module.exports = function title() {
    return new SafeString(escapeExpression(this.title || ''));
};
