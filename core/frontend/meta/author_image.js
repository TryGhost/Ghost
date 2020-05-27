const urlUtils = require('../../shared/url-utils');
const getContextObject = require('./context_object.js');
const _ = require('lodash');

function getAuthorImage(data, absolute) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.profile_image) {
        return urlUtils.urlFor('image', {image: contextObject.primary_author.profile_image}, absolute);
    }
    return null;
}

module.exports = getAuthorImage;
