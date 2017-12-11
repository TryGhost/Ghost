var urlService = require('../../services/url'),
    getContextObject = require('./context_object.js'),
    _ = require('lodash');

function getOgImage(data) {
    var context = data.context ? data.context : null,
        contextObject = getContextObject(data, context);

    if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
        if (contextObject.og_image) {
            return urlService.utils.urlFor('image', {image: contextObject.og_image}, true);
        } else if (contextObject.feature_image) {
            return urlService.utils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }

    return null;
}

module.exports = getOgImage;
