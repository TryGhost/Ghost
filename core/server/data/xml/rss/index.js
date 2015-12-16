var _        = require('lodash'),
    cheerio  = require('cheerio'),
    crypto   = require('crypto'),
    downsize = require('downsize'),
    RSS      = require('rss'),
    url      = require('url'),
    config   = require('../../../config'),
    errors   = require('../../../errors'),
    filters  = require('../../../filters'),

    // Really ugly temporary hack for location of things
    fetchData = require('../../../controllers/frontend/fetch-data'),

    generate,
    generateFeed,
    getFeedXml,
    feedCache = {};

function isTag(req) {
    return req.originalUrl.indexOf('/' + config.routeKeywords.tag + '/') !== -1;
}

function isAuthor(req) {
    return req.originalUrl.indexOf('/' + config.routeKeywords.author + '/') !== -1;
}

function handleError(next) {
    return function handleError(err) {
        return next(err);
    };
}

function getData(channelOpts, slugParam) {
    channelOpts.data = channelOpts.data || {};

    return fetchData(channelOpts, slugParam).then(function (result) {
        var response = {},
            titleStart = '';

        if (result.data && result.data.tag) { titleStart = result.data.tag[0].name + ' - ' || ''; }
        if (result.data && result.data.author) { titleStart = result.data.author[0].name + ' - ' || ''; }

        response.title = titleStart + config.theme.title;
        response.description = config.theme.description;
        response.results = {
            posts: result.posts,
            meta: result.meta
        };

        return response;
    });
}

function getBaseUrl(req, slugParam) {
    var baseUrl = config.paths.subdir;

    if (isTag(req)) {
        baseUrl += '/' + config.routeKeywords.tag + '/' + slugParam + '/rss/';
    } else if (isAuthor(req)) {
        baseUrl += '/' + config.routeKeywords.author + '/' + slugParam + '/rss/';
    } else {
        baseUrl += '/rss/';
    }

    return baseUrl;
}

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

getFeedXml = function getFeedXml(path, data) {
    var dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (!feedCache[path] || feedCache[path].hash !== dataHash) {
        // We need to regenerate
        feedCache[path] = {
            hash: dataHash,
            xml: generateFeed(data)
        };
    }

    return feedCache[path].xml;
};

generateFeed = function generateFeed(data) {
    var feed = new RSS({
        title: data.title,
        description: data.description,
        generator: 'Ghost ' + data.version,
        feed_url: data.feedUrl,
        site_url: data.siteUrl,
        ttl: '60',
        custom_namespaces: {
            content: 'http://purl.org/rss/1.0/modules/content/',
            media: 'http://search.yahoo.com/mrss/'
        }
    });

    data.results.posts.forEach(function forEach(post) {
        var itemUrl = config.urlFor('post', {post: post, secure: data.secure}, true),
            htmlContent = processUrls(post.html, data.siteUrl, itemUrl),
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

    return filters.doFilter('rss.feed', feed).then(function then(feed) {
        return feed.xml();
    });
};

generate = function generate(req, res, next) {
    // Initialize RSS
    var pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug,
        baseUrl   = getBaseUrl(req, slugParam);

    // Ensure we at least have an empty object for postOptions
    req.channelConfig.postOptions = req.channelConfig.postOptions || {};
    // Set page on postOptions for the query made later
    req.channelConfig.postOptions.page = pageParam;

    req.channelConfig.slugParam = slugParam;

    return getData(req.channelConfig).then(function then(data) {
        var maxPage = data.results.meta.pagination.pages;

        // If page is greater than number of pages we have, redirect to last page
        if (pageParam > maxPage) {
            return next(new errors.NotFoundError());
        }

        data.version = res.locals.safeVersion;
        data.siteUrl = config.urlFor('home', {secure: req.secure}, true);
        data.feedUrl = config.urlFor({relativeUrl: baseUrl, secure: req.secure}, true);
        data.secure = req.secure;

        return getFeedXml(req.originalUrl, data).then(function then(feedXml) {
            res.set('Content-Type', 'text/xml; charset=UTF-8');
            res.send(feedXml);
        });
    }).catch(handleError(next));
};

module.exports = generate;
