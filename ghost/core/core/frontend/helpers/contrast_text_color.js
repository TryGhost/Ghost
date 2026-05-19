const {textColorForBackgroundColor} = require('@tryghost/color-utils');

module.exports = function contrast_text_color(color) { // eslint-disable-line camelcase
    const backgroundColor = (typeof color === 'string' && color.trim()) ? color.trim() : '#15171A';

    try {
        return textColorForBackgroundColor(backgroundColor).hex();
    } catch (err) {
        return '#FFFFFF';
    }
};
