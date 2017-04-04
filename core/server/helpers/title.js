// # Title Helper
// Usage: `{{title}}`
//
// Overrides the standard behaviour of `{[title}}` to ensure the content is correctly escaped

var proxy = require('./proxy'),
    SafeString = proxy.SafeString,
    escapeExpression = proxy.escapeExpression;

module.exports = function title() {
    return new SafeString(escapeExpression(this.title || ''));
};
