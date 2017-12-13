var urlService = require('../../services/url');

function getAuthorUrl(data, absolute) {
    var context = data.context ? data.context[0] : null;

    context = context === 'amp' ? 'post' : context;

    if (data.author) {
        return urlService.utils.urlFor('author', {author: data.author}, absolute);
    }
    if (data[context] && data[context].author) {
        return urlService.utils.urlFor('author', {author: data[context].author}, absolute);
    }
    return null;
}

module.exports = getAuthorUrl;
