var _ = require('lodash'),
    config = require('../../config'),
    labs = require('../../utils/labs'),
    channelConfig;

channelConfig = function channelConfig() {
    var defaults = {
        index: {
            name: 'index',
            route: '/',
            frontPageTemplate: 'home'
        },
        tag: {
            name: 'tag',
            route: '/' + config.routeKeywords.tag + '/:slug/',
            postOptions: {
                filter: labs.isSet('hashtags') ? 'tags:\'%s\'+tags.visibility:\'public\'' : 'tags:\'%s\''
            },
            data: {
                tag: {
                    type: 'read',
                    resource: 'tags',
                    options: labs.isSet('hashtags') ? {slug: '%s', visibility: 'public'} : {slug: '%s'}
                }
            },
            slugTemplate: true,
            editRedirect: '/ghost/settings/tags/:slug/'
        },
        author: {
            name: 'author',
            route: '/' + config.routeKeywords.author + '/:slug/',
            postOptions: {
                filter: 'author:\'%s\''
            },
            data: {
                author: {
                    type: 'read',
                    resource: 'users',
                    options: {slug: '%s'}
                }
            },
            slugTemplate: true,
            editRedirect: '/ghost/team/:slug/'
        }
    };

    return defaults;
};

module.exports.list = function list() {
    return channelConfig();
};

module.exports.get = function get(name) {
    return _.cloneDeep(channelConfig()[name]);
};
