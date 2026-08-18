const {textColorForBackgroundColor} = require('@tryghost/color-utils');

// eslint-disable-next-line camelcase
module.exports = function contrast_text_color(color) {
    const backgroundColor = (typeof color === 'string' && color.trim()) ? color.trim() : '#15171A';

    try {
        return textColorForBackgroundColor(backgroundColor).hex();
    } catch (err) {
        return '#FFFFFF';
    }
};
