var _ = require('lodash'),
    Promise = require('bluebird'),
    api = require('../../api'),
    debug = require('ghost-ignition').debug('url-service'),
    events = require('../../events'),
    urlUtils  = require('../../utils').url,

    resources = {
        posts: {
            resourceType: ['post', 'news'],
            prefetch: function prefetch() {
                return api.posts.browse({
                    context: {
                        internal: true
                    },
                    filter: 'visibility:public',
                    status: 'published',
                    staticPages: false,
                    limit: 'all',
                    include: 'author,tags'
                })
                .then(function formatResponse(resp) {
                    return resp.posts;
                });
            },
            toUrl: function toUrl(post) {
                return urlUtils.urlFor('post', {post: post}, true);
            }
        }
    },

    urlService;

// Urls are paths understood by Ghost
// Things we need to know:
// route,
// resourceType (post, page, tag, author, channel, news, image, other) (array?)
// contexts?
// identifier / filter that generated it, e.g. tag = filter=tag:x
// last modified
// change frequency
// priority
//

function buildList() {
    var props = {};

    _.each(resources, function buildProps(resource, resourceName) {
        props[resourceName] = resource.prefetch();
    });

    return Promise.props(props);
}


class UrlService {
    constructor() {
        // Do something on initialisation
        this._urlCache = {};
    }

    loadAllUrls() {
        var self = this;
        debug('load start');

        buildList()
            .then(function success(response) {
                debug('load end, start processing');

                _.each(response, function (items, resourceName) {
                    var defaults = resources[resourceName];
                    _.each(items, function (resource) {
                        var url = defaults.toUrl(resource);

                        self._urlCache[url] = {
                            resourceType: resources[resourceName].resourceType
                        };
                    });
                });

                debug('processing done, url cache built', _.size(self._urlCache));
            })
            .catch(function error(err) {
                debug('load error', err);
            });
    }

    // registerAddEvent(eventName) {
    //     events.on(eventName, addOrUpdateUrlCache);
    // }
    //
    // registerRemoveEvent(eventName) {
    //
    // }
};


module.exports.init = function () {
    urlService = new UrlService();

    // Register a listener for server-start to load all the known urls
    // events.on('server:start', function loadAllUrls() {
    //     urlService.loadAllUrls();
    // });

    // urlService.registerAddEvent('post.published');
    // urlService.registerAddEvent('post.published.edited');
    // urlService.registerRemoveEvent('post.unpublished');
};
