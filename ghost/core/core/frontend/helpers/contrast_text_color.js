const {Color} = require('@tryghost/color-utils');

module.exports = function contrast_text_color(color) { // eslint-disable-line camelcase
    const backgroundColor = (typeof color === 'string' && color.trim()) ? color.trim() : '#15171A';

    try {
        const rgb = Color(backgroundColor).rgb();
        const yiq = (rgb.red() * 299 + rgb.green() * 587 + rgb.blue() * 114) / 1000;

        return yiq >= 128 ? '#000000' : '#FFFFFF';
    } catch (err) {
        return '#FFFFFF';
    }
};
