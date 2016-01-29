var config = require('../../config');

function getAuthorUrl(data, absolute) {
    var context = data.context ? data.context[0] : null;
    if (data.author) {
        return config.urlFor('author', {author: data.author}, absolute);
    }
    if (data[context] && data[context].author) {
        return config.urlFor('author', {author: data[context].author}, absolute);
    }
    return null;
}

module.exports = getAuthorUrl;
