var _ = require('lodash'),
    config = require('../../config'),
    labs = require('../../utils/labs'),
    getConfig;

getConfig = function getConfig(name) {
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
                filter: labs.isSet('hiddenTags') ? 'tags:%s+tags.hidden:false' : 'tags:%s'
            },
            data: {
                tag: {
                    type: 'read',
                    resource: 'tags',
                    options: labs.isSet('hiddenTags') ? {slug: '%s', hidden: false} : {slug: '%s'}
                }
            },
            slugTemplate: true
        },
        author: {
            name: 'author',
            route: '/' + config.routeKeywords.author + '/:slug/',
            postOptions: {
                filter: 'author:%s'
            },
            data: {
                author: {
                    type: 'read',
                    resource: 'users',
                    options: {slug: '%s'}
                }
            },
            slugTemplate: true
        }
    };

    return _.cloneDeep(defaults[name]);
};

module.exports = getConfig;
