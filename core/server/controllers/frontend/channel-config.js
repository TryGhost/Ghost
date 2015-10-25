var config = require('../../config'),
    defaults;

defaults = {
    index: {
        name: 'home',
        route: '/',
        firstPageTemplate: 'home'
    },
    tag: {
        name: 'tag',
        route: '/' + config.routeKeywords.tag + '/:slug/',
        postOptions: {
            filter: 'tags:%s'
        },
        data: {
            tag: {
                type: 'read',
                resource: 'tags',
                options: {slug: '%s'}
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

module.exports = defaults;
