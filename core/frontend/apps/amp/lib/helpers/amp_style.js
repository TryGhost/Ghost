const {SafeString, escapeExpression} = require('../../../../services/proxy');
/*
 * @TODO:
 *  replace with Ghost util when https://github.com/TryGhost/Admin/blob/main/app/utils/color.js
 *  has been refactored into a module
*/
const convert = require('color-convert');

module.exports = function amp_style(options) { // eslint-disable-line camelcase
    if (options.data.site.accent_color) {
        const accentColor = escapeExpression(options.data.site.accent_color);
        const accentColorHSL = convert.rgb.hsl(convert.hex.rgb(options.data.site.accent_color));
        return new SafeString(`:root {--ghost-accent-color: ${accentColor};--ghost-accent-h: ${accentColorHSL[0]};--ghost-accent-s: ${accentColorHSL[1]}%;--ghost-accent-l: ${accentColorHSL[2]}%;}`);
    }
};
