const downsize = require('downsize');
const Promise = require('bluebird');
const RSS = require('rss');
const urlUtils = require('../../../shared/url-utils');
const {routerManager} = require('../routing');

const generateTags = function generateTags(data) {
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

const generateItem = function generateItem(post, secure) {
    const cheerio = require('cheerio');

    const itemUrl = routerManager.getUrlByResourceId(post.id, {secure, absolute: true});
    const htmlContent = cheerio.load(post.html || '');
    const item = {
        title: post.title,
        // @TODO: DRY this up with data/meta/index & other excerpt code
        description: post.custom_excerpt || post.meta_description || downsize(htmlContent.html(), {words: 50}),
        guid: post.id,
        url: itemUrl,
        date: post.published_at,
        categories: generateTags(post),
        author: post.primary_author ? post.primary_author.name : null,
        custom_elements: []
    };

    if (post.feature_image) {
        const imageUrl = urlUtils.urlFor('image', {image: post.feature_image, secure}, true);

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
const generateFeed = function generateFeed(baseUrl, data) {
    const {secure} = data;

    const feed = new RSS({
        title: data.title,
        description: data.description,
        generator: 'Ghost ' + data.safeVersion,
        feed_url: urlUtils.urlFor({relativeUrl: baseUrl, secure}, true),
        site_url: urlUtils.urlFor('home', {secure}, true),
        image_url: urlUtils.urlFor({relativeUrl: 'favicon.png'}, true),
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    return data.posts.reduce((feedPromise, post) => {
        return feedPromise.then(() => {
            const item = generateItem(post, secure);
            return feed.item(item);
        });
    }, Promise.resolve()).then(() => {
        return feed.xml();
    });
};

module.exports = generateFeed;
