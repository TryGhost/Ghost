var downsize = require('downsize'),
    Promise = require('bluebird'),
    RSS = require('rss'),
    urlService = require('../../services/url'),
    filters = require('../../filters'),
    generateFeed,
    generateItem,
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

generateItem = function generateItem(post, siteUrl, secure) {
    var itemUrl = urlService.getUrlByResourceId(post.id, {secure: secure, absolute: true}),
        htmlContent = urlService.utils.makeAbsoluteUrls(post.html, siteUrl, itemUrl),
        item = {
            title: post.title,
            // @TODO: DRY this up with data/meta/index & other excerpt code
            description: post.custom_excerpt || post.meta_description || downsize(htmlContent.html(), {words: 50}),
            guid: post.id,
            url: itemUrl,
            date: post.published_at,
            categories: generateTags(post),
            author: post.primary_author ? post.primary_author.name : null,
            custom_elements: []
        },
        imageUrl;

    if (post.feature_image) {
        imageUrl = urlService.utils.urlFor('image', {image: post.feature_image, secure: secure}, true);

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

    return item;
};

/**
 * Generate Feed
 *
 * Data is an object which contains the res.locals + results from fetching a collection, but without related data.
 *
 * @param {string} baseUrl
 * @param {{title, description, safeVersion, secure, posts}} data
 */
generateFeed = function generateFeed(baseUrl, data) {
    const siteUrl = urlService.utils.urlFor('home', {secure: data.secure}, true);
    const feed = new RSS({
        title: data.title,
        description: data.description,
        generator: 'Ghost ' + data.safeVersion,
        feed_url: urlService.utils.urlFor({relativeUrl: baseUrl, secure: data.secure}, true),
        site_url: siteUrl,
        image_url: urlService.utils.urlFor({relativeUrl: 'favicon.png'}, true),
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    return data.posts.reduce((feedPromise, post) => {
        return feedPromise.then(() => {
            const item = generateItem(post, siteUrl, data.secure);
            return filters.doFilter('rss.item', item, post).then((item) => {
                return feed.item(item);
            });
        });
    }, Promise.resolve()).then(() => {
        return filters.doFilter('rss.feed', feed).then((feed) => {
            return feed.xml();
        });
    });
};

module.exports = generateFeed;
