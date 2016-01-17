var schema = require('../schema').checks,
    config = require('../../config');

function getUrl(data, absolute) {
    if (schema.isPost(data)) {
        return config.urlFor('post', {post: data, secure: data.secure}, absolute);
    }

    if (schema.isTag(data)) {
        return config.urlFor('tag', {tag: data, secure: data.secure}, absolute);
    }

    if (schema.isUser(data)) {
        return config.urlFor('author', {author: data, secure: data.secure}, absolute);
    }

    if (schema.isNav(data)) {
        return config.urlFor('nav', {nav: data, secure: data.secure}, absolute);
    }

    return config.urlFor(data, {}, absolute);
}

module.exports = getUrl;
