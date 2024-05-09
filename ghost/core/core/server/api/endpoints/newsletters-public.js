const models = require('../../models');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'newsletters',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        query(frame) {
            return models.Newsletter.findPage(frame.options);
        }
    }
};

module.exports = controller;
