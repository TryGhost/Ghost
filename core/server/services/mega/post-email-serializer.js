const juice = require('juice');
const template = require('./template');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
const moment = require('moment');
const cheerio = require('cheerio');

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
    let juicedHtml = juice(template({post, site: getSite()}));
    // Force all links to open in new tab
    let _cheerio = cheerio.load(juicedHtml);
    _cheerio('a').attr('target','_blank');
    juicedHtml = _cheerio.html();
    return {
        subject: post.email_subject || post.title,
        html: juicedHtml,
        plaintext: post.plaintext
    };
};

module.exports = {
    serialize: serialize
};
