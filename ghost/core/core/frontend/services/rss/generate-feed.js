const downsize = require('downsize-cjs');
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

const generateItem = function generateItem(post) {
    const cheerio = require('cheerio');

    // RSS feeds carry posts (pages don't appear in RSS), so the router-level
    // type is always 'posts'. The post object on the public API has its DB
    // `type` and `status` columns stripped by the serializer, so we tag the
    // type here and default status to published (RSS only ever carries
    // published posts) so the lazy URL service can evaluate its base filter.
    const itemUrl = routerManager.getUrlForResource({status: 'published', ...post, type: 'posts'}, {absolute: true});
    const htmlContent = cheerio.load(post.html || '');

    // Tidy up cards for RSS readers (no Ghost CSS/JS available). This runs
    // before the item is built so the excerpt fallback below sees clean
    // content rather than raw player chrome (e.g. "Play video 0:00 1× Unmute").
    htmlContent('.kg-card').each(function (index, card) {
        // Bookmark card
        htmlContent(card).find('.kg-bookmark-thumbnail, .kg-bookmark-icon, .kg-bookmark-metadata').remove();
        htmlContent(card).find('.kg-bookmark-description').wrap('<small></small>');

        // Video card — strip custom player chrome, fall back to a native playable <video>
        htmlContent(card).find('.kg-video-overlay, .kg-video-player-container').remove();
        const videoPoster = htmlContent(card).attr('data-kg-custom-thumbnail') || htmlContent(card).attr('data-kg-thumbnail');
        const video = htmlContent(card).find('.kg-video-card video');
        video.attr('poster', videoPoster);
        video.attr('controls', '');
        // The inline style was the old CSS-thumbnail mechanism; the real poster replaces it
        video.removeAttr('style');

        // Audio card — strip chrome including the title; native playable <audio>
        htmlContent(card).find('.kg-audio-thumbnail, .kg-audio-player, .kg-audio-title').remove();
        const audio = htmlContent(card).find('.kg-audio-card audio');
        audio.attr('controls', '');
        // Drop the now-purposeless player container, lifting its children into the card
        const audioContainer = htmlContent(card).find('.kg-audio-player-container');
        audioContainer.before(audioContainer.html());
        audioContainer.remove();
    });

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
        const imageUrl = urlUtils.urlFor('image', {image: post.feature_image}, true);

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
 * @param {{title, description, safeVersion, posts}} data
 * @returns {string}
 */
const generateFeed = function generateFeed(baseUrl, data) {
    const feed = new RSS({
        title: data.title,
        description: data.description,
        generator: 'Ghost ' + data.safeVersion,
        feed_url: urlUtils.urlFor({relativeUrl: baseUrl}, true),
        site_url: urlUtils.urlFor('home', true),
        image_url: urlUtils.urlFor({relativeUrl: 'favicon.png'}, true),
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    for (const post of data.posts) {
        const item = generateItem(post);
        feed.item(item);
    }

    return feed.xml();
};

module.exports = generateFeed;
