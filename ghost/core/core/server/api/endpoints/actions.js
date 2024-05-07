const models = require('../../models');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'actions',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'page',
            'limit',
            'fields',
            'include',
            'filter'
        ],
        permissions: true,
        query(frame) {
            return models.Action.findPage(frame.options);
        }
    }
};

module.exports = controller;
