const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') ||
        (frame.options.columns.includes('excerpt') && frame.options.formats && frame.options.formats.includes('plaintext'))) {
        if (_.isEmpty(attrs.custom_excerpt)) {
            let plaintext = model.get('plaintext');

            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        } else {
            attrs.excerpt = attrs.custom_excerpt;
        }
    }

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') ||
    (frame.options.columns.includes('reading_time'))) {
        if (attrs.html) {
            let additionalImages = 0;

            if (attrs.feature_image) {
                additionalImages += 1;
            }

            attrs.reading_time = readingMinutes(attrs.html, additionalImages);
        }
    }
};
