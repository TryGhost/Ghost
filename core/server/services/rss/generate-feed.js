var downsize = require('downsize'),
    RSS = require('rss'),
    utils = require('../../utils'),
    filters = require('../../filters'),
    processUrls = require('../../utils/make-absolute-urls'),

    generateFeed,
    generateTags;

generateTags = function generateTags(data) {
    if (data.tags) {
        return data.tags.reduce(function (tags, tag) {
            if (tag.visibility !== 'internal') {
                tags.push(tag.name);
            }
            return tags;
        }, []);
    }

    return [];
};

generateFeed = function generateFeed(data) {
    var feed = new RSS({
        title: data.title,
        description: data.description,
        generator: 'Ghost ' + data.version,
        feed_url: data.feedUrl,
        site_url: data.siteUrl,
        image_url: utils.url.urlFor({relativeUrl: 'favicon.png'}, true),
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    data.results.posts.forEach(function forEach(post) {
        var itemUrl = utils.url.urlFor('post', {post: post, secure: data.secure}, true),
            htmlContent = processUrls(post.html, data.siteUrl, itemUrl),
            item = {
                title: post.title,
                description: post.custom_excerpt || post.meta_description || downsize(htmlContent.html(), {words: 50}),
                guid: post.id,
                url: itemUrl,
                date: post.published_at,
                categories: generateTags(post),
                author: post.author ? post.author.name : null,
                custom_elements: []
            },
            imageUrl;

        if (post.feature_image) {
            imageUrl = utils.url.urlFor('image', {image: post.feature_image, secure: data.secure}, true);

            // Add a media content tag
            item.custom_elements.push({
                'media:content': {
                    _attr: {
                        url: imageUrl,
                        medium: 'image'
                    }
                }
            });

            // Also add the image to the content, because not all readers support media:content
            htmlContent('p').first().before('<img src="' + imageUrl + '" />');
            htmlContent('img').attr('alt', post.title);
        }

        item.custom_elements.push({
            'content:encoded': {
                _cdata: htmlContent.html()
            }
        });

        filters.doFilter('rss.item', item, post).then(function then(item) {
            feed.item(item);
        });
    });

    return filters.doFilter('rss.feed', feed).then(function then(feed) {
        return feed.xml();
    });
};

module.exports = generateFeed;
