var _        = require('lodash'),
    Promise  = require('bluebird'),
    cheerio  = require('cheerio'),
    crypto   = require('crypto'),
    downsize = require('downsize'),
    RSS      = require('rss'),
    url      = require('url'),
    config   = require('../../../config'),
    api      = require('../../../api'),
    filters  = require('../../../filters'),

    generate,
    generateFeed,
    getFeedXml,
    feedCache = {};

function isPaginated(req) {
    return req.route.path.indexOf(':page') !== -1;
}

function isTag(req) {
    return req.route.path.indexOf('/' + config.routeKeywords.tag + '/') !== -1;
}

function isAuthor(req) {
    return req.route.path.indexOf('/' + config.routeKeywords.author + '/') !== -1;
}

function handleError(next) {
    return function (err) {
        return next(err);
    };
}

function getOptions(req, pageParam, slugParam) {
    var options = {};

    if (pageParam) { options.page = pageParam; }
    if (isTag(req)) { options.tag = slugParam; }
    if (isAuthor(req)) { options.author = slugParam; }

    options.include = 'author,tags,fields';

    return options;
}

function getData(options) {
    var ops = {
        title: api.settings.read('title'),
        description: api.settings.read('description'),
        permalinks: api.settings.read('permalinks'),
        results: api.posts.browse(options)
    };

    return Promise.props(ops).then(function (result) {
        var titleStart = options.tags ? result.results.meta.filters.tags[0].name + ' - ' :
                options.author ? result.results.meta.filters.author.name + ' - ' : '';

        return {
            title: titleStart + result.title.settings[0].value,
            description: result.description.settings[0].value,
            permalinks: result.permalinks.settings[0],
            results: result.results
        };
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
    ['href', 'src'].forEach(function (attributeName) {
        htmlContent('[' + attributeName + ']').each(function (ix, el) {
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
            } catch (e) {
                return;
            }

            // compose an absolute URL

            // if the relative URL begins with a '/' use the blog URL (including sub-directory)
            // as the base URL, otherwise use the post's URL.
            baseUrl = attributeValue[0] === '/' ? siteUrl : itemUrl;

            // prevent double subdirectories
            if (attributeValue.indexOf(config.paths.subdir) === 0) {
                attributeValue = attributeValue.replace(config.paths.subdir, '');
            }

            // prevent double slashes
            if (baseUrl.slice(-1) === '/' && attributeValue[0] === '/') {
                attributeValue = attributeValue.substr(1);
            }

            attributeValue = baseUrl + attributeValue;
            el.attr(attributeName, attributeValue);
        });
    });

    return htmlContent;
}

getFeedXml = function (path, data) {
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

generateFeed = function (data) {
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

    data.results.posts.forEach(function (post) {
        var itemUrl = config.urlFor('post', {post: post, permalinks: data.permalinks, secure: data.secure}, true),
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

        feed.item(item);
    });

    return filters.doFilter('rss.feed', feed).then(function (feed) {
        return feed.xml();
    });
};

generate = function (req, res, next) {
    // Initialize RSS
    var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
        slugParam = req.params.slug,
        baseUrl   = getBaseUrl(req, slugParam),
        options   = getOptions(req, pageParam, slugParam);

    // No negative pages, or page 1
    if (isNaN(pageParam) || pageParam < 1 || (pageParam === 1 && isPaginated(req))) {
        return res.redirect(baseUrl);
    }

    return getData(options).then(function (data) {
        var maxPage = data.results.meta.pagination.pages;

        // If page is greater than number of pages we have, redirect to last page
        if (pageParam > maxPage) {
            return res.redirect(baseUrl + maxPage + '/');
        }

        data.version = res.locals.safeVersion;
        data.siteUrl = config.urlFor('home', {secure: req.secure}, true);
        data.feedUrl = config.urlFor({relativeUrl: baseUrl, secure: req.secure}, true);
        data.secure = req.secure;

        return getFeedXml(req.route.path, data).then(function (feedXml) {
            res.set('Content-Type', 'text/xml; charset=UTF-8');
            res.send(feedXml);
        });
    }).catch(handleError(next));
};

module.exports = generate;
