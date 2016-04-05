var _            = require('lodash'),
    config       = require('../config'),
    fetchData    = require('../controllers/frontend/fetch-data'),
    generateFeed = require('../data/xml/rss/feed-generator'),
    url          = require('url'),
    generateFeedDelta;

// @TODO: tests. Should this actually be part of the RSS module?

function generateFeedTitle(post, feedUrl) {
    var title = '',
        requiredDataPattern = new RegExp('(' + config.routeKeywords.author + '|' + config.routeKeywords.tag + ')\/([A-Za-z0-9]+)\/rss\/'),
        data, tag;

    data = requiredDataPattern.exec(feedUrl);

    if (data) {
        if (data[1] == config.routeKeywords.author) {
            title = post.author.name + ' - ' || '';
        }

        if (data[1] == config.routeKeywords.tag) {
            tag = _.find(post.tags, { slug: data[2] });

            if (tag) {
                title = tag.name + ' - ' || '';
            }
        }
    }

    title += config.theme.title;

    return title;
}

generateFeedDelta = function (post, feedUrl) {
    var channelOptions = {
        isRSS: true,
        postOptions: {
            filter: 'id:' + post.attributes.id
        }
    };

    return fetchData(channelOptions)
        .then(function(data) {
            return generateFeed(
                generateFeedTitle(data.posts[0], feedUrl),
                config.theme.description,
                feedUrl,
                url.parse(feedUrl).protocol == 'https',
                data.posts
            );
        });
};

module.exports = generateFeedDelta;
