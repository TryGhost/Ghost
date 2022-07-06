const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');
    // This function is split up in 3 conditions for 3 different purposes:
    // 1. Gets excerpt from post's plaintext. If custom_excerpt exists, it overrides the excerpt but the key remains excerpt.
    if (Object.prototype.hasOwnProperty.call(frame.options, 'columns') || _.includes(frame.options.columns, 'excerpt') || _.includes(frame.options.columns, 'excerpt') && frame.options.formats && frame.options.formats.includes('plaintext')) {
        if (_.includes(frame.options.columns, 'excerpt')) {
            if (!attrs.custom_excerpt || attrs.custom_excerpt === null) {
                let plaintext = model.get('plaintext');
                if (plaintext) {
                    attrs.excerpt = plaintext.substring(0, 500);
                } else {
                    attrs.excerpt = null;
                }
                if (!frame.options.columns.includes('custom_excerpt')) {
                    delete attrs.custom_excerpt;
                }
            } else {
                attrs.excerpt = attrs.custom_excerpt;
                if (!_.includes(frame.options.columns, 'custom_excerpt')) {
                    delete attrs.custom_excerpt;
                }
            }
        }
    }
    // 2. Displays plaintext if requested by user as a field. Also works if used as format.
    if (_.includes(frame.options.columns, 'plaintext') || frame.options.formats && frame.options.formats.includes('plaintext')) {
        let plaintext = model.get('plaintext');
        if (plaintext){
            attrs.plaintext = plaintext;
        } else {
            delete attrs.plaintext;
        }
    }

    // 3. Displays excerpt if no columns was requested - specifically needed for the Admin Posts API.

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns')) {
        let plaintext = model.get('plaintext');
        let customExcerpt = model.get('custom_excerpt');

        if (customExcerpt !== null){
            attrs.excerpt = customExcerpt;
        } else {
            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        }
    }

    // reading_time still only works when used along with formats=html.

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
