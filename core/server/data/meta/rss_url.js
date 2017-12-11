var urlService = require('../../services/url');

function getRssUrl(data, absolute) {
    return urlService.utils.urlFor('rss', {secure: data.secure}, absolute);
}

module.exports = getRssUrl;
