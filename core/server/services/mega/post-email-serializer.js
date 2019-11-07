const juice = require('juice');
const template = require('./template');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
const moment = require('moment');

const getSite = () => {
    return Object.assign({}, settingsCache.getPublic(), {
        url: urlUtils.urlFor('home', true)
    });
};

const serialize = (post) => {
    post.published_at = post.published_at ? moment(post.published_at).format('DD MMM YYYY') : moment().format('DD MMM YYYY');
    post.authors = post.authors && post.authors.map(author => author.name).join(',');
    post.html = post.html || '';
    if (post.posts_meta) {
        post.email_subject = post.posts_meta.email_subject;
    }
    return {
        subject: post.email_subject || post.title,
        html: juice(template({post, site: getSite()})),
        plaintext: post.plaintext
    };
};

module.exports = {
    serialize: serialize
};
