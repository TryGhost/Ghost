var config = require('../../config');

function getRssUrl(data, absolute) {
    return config.urlFor('rss', {secure: data.secure}, absolute);
}

module.exports = getRssUrl;
