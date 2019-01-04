module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');

    if (!frame.options.hasOwnProperty('columns') ||
        (frame.options.columns.includes('excerpt') && frame.options.formats && frame.options.formats.includes('plaintext'))) {
        if (_.isEmpty(attrs.custom_excerpt)) {
            const plaintext = model.get('plaintext');
            attrs.excerpt = plaintext.substring(0, 500);
        } else {
            attrs.excerpt = attrs.custom_excerpt;
        }
    }
};
