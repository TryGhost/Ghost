var _        = require('lodash'),
    RSS      = require('rss'),
    config   = require('../../../config'),
    filters  = require('../../../filters'),
    cheerio  = require('cheerio'),
    downsize = require('downsize'),
    generateFeed;

// @TODO: tests. Also could this be used by the rss module itself?

function processUrls(html, siteUrl, itemUrl) {
    var htmlContent = cheerio.load(html, {decodeEntities: false});
    // convert relative resource urls to absolute
    ['href', 'src'].forEach(function forEach(attributeName) {
        htmlContent('[' + attributeName + ']').each(function each(ix, el) {
            var baseUrl,
                attributeValue,
                parsed;

            el = htmlContent(el);

            attributeValue = el.attr(attributeName);

            // if URL is absolute move on to the next element
            try {
                parsed = url.parse(attributeValue);

                if (parsed.protocol) {
                    return;
                }

                // Do not convert protocol relative URLs
                if (attributeValue.lastIndexOf('//', 0) === 0) {
                    return;
                }
            } catch (e) {
                return;
            }

            // compose an absolute URL

            // if the relative URL begins with a '/' use the blog URL (including sub-directory)
            // as the base URL, otherwise use the post's URL.
            baseUrl = attributeValue[0] === '/' ? siteUrl : itemUrl;
            attributeValue = config.urlJoin(baseUrl, attributeValue);
            el.attr(attributeName, attributeValue);
        });
    });

    return htmlContent;
}

generateFeed = function (title, description, feedUrl, secure, posts) {
    var siteUrl = config.urlFor('home', {secure: secure}, true),
        feed = new RSS({
        title: title,
        description: description,
        generator: 'Ghost ' + config.ghostVersion.match(/^(\d+\.)?(\d+)/)[0],
        feed_url: feedUrl,
        site_url: siteUrl,
        hub: config.urlFor('hub', {secure: secure}, true),
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    posts.forEach(function (post) {
        var itemUrl = config.urlFor('post', {post: post, secure: secure}, true),
            htmlContent = processUrls(post.html, siteUrl, itemUrl),
            item = {
                title: post.title,
                description: post.meta_description || downsize(htmlContent.html(), {words: 50}),
                guid: post.uuid,
                url: itemUrl,
                date: post.published_at,
                categories: _.pluck(post.tags, 'name'),
                author: post.author ? post.author.name : null,
                custom_elements: []
            },
            imageUrl;

        if (post.image) {
            imageUrl = config.urlFor('image', {image: post.image, secure: data.secure}, true);

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

    return filters.doFilter('rss.feed', feed).then(function (feed) {
        return feed.xml();
    });
};

module.exports = generateFeed;
