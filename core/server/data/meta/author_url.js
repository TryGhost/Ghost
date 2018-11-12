const _ = require('lodash'),
    urlService = require('../../services/url');

function getAuthorUrl(data, absolute) {
    let context = data.context ? data.context[0] : null;

    // Here data.context can be:
    // [tag] in case of tag url
    // [author] in case of author url
    // [post] in case of normal post
    // [amp, post] for /{post.slug}/amp/
    // [page] for posts converted to pages
    // [{post.slug}, page] for posts converted to pages accessing via dynamic route
    if (_.includes(data.context, 'page') && data.page) {
        context = 'page';
    } else {
        context = context === 'amp' ? 'post' : context;
    }

    if (data.author) {
        return urlService.getUrlByResourceId(data.author.id, {absolute: absolute, secure: data.author.secure, withSubdirectory: true});
    }

    if (data[context] && data[context].primary_author) {
        return urlService.getUrlByResourceId(data[context].primary_author.id, {absolute: absolute, secure: data[context].secure, withSubdirectory: true});
    }

    return null;
}

module.exports = getAuthorUrl;
