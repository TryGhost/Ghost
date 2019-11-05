const juice = require('juice');
const template = require('./template');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');

const getSite = () => {
    return Object.assign({}, settingsCache.getPublic(), {
        url: urlUtils.urlFor('home', true)
    });
};

const serialize = (post) => {
    return {
        subject: post.email_subject || post.title,
        html: juice(template({post, site: getSite()}))
    };
};

module.exports = {
    serialize: serialize
};
