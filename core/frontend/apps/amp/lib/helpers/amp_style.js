const {SafeString, escapeExpression} = require('../../../../services/proxy');

module.exports = function amp_style(options) { // eslint-disable-line camelcase
    if (options.data.site.accent_color) {
        const accentColor = escapeExpression(options.data.site.accent_color);
        return new SafeString(`:root {--ghost-accent-color: ${accentColor};}`);
    }
};
