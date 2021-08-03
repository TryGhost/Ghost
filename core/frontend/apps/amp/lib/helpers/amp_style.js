const {SafeString, escapeExpression} = require('../../../../services/proxy');
const color = require('color');

module.exports = function amp_style(options) { // eslint-disable-line camelcase
    if (options.data.site.accent_color) {
        const accentColor = escapeExpression(options.data.site.accent_color);
        const accentColorHSL = color(options.data.site.accent_color).hsl().round();
        return new SafeString(`:root {--ghost-accent-color: ${accentColor};--ghost-accent-h: ${accentColorHSL.hue()};--ghost-accent-s: ${accentColorHSL.saturationl()}%;--ghost-accent-l: ${accentColorHSL.lightness()}%;}`);
    }
};
