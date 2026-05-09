const {textColorForBackgroundColor} = require('@tryghost/color-utils');

module.exports = function contrast_text_color(color) { // eslint-disable-line camelcase
    const backgroundColor = (typeof color === 'string' && color.trim()) ? color.trim() : '#15171A';
    try {
        const contrastColor = textColorForBackgroundColor(backgroundColor).hex();
        if (contrastColor === '#FFFFFF') return 'var(--ghost-contrast-color-white, #FFFFFF)';
        if (contrastColor === '#000000') return 'var(--ghost-contrast-color-black, #000000)';
        return contrastColor;
    } catch (err) {
        return 'var(--ghost-contrast-color-white, #FFFFFF)';
    }
};
