var config           = require('../../config'),
    getContextObject = require('./context_object.js'),
    _                = require('lodash');

function getAuthorImage(data, absolute) {
    var context = data.context ? data.context : null,
        contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.author && contextObject.author.image) {
        return config.urlFor('image', {image: contextObject.author.image}, absolute);
    }
    return null;
}

module.exports = getAuthorImage;
