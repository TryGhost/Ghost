const models = require('../../models');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'roles',
    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'permissions'
        ],
        validation: {
            options: {
                permissions: ['assign']
            }
        },
        permissions: true,
        query(frame) {
            return models.Role.findAll(frame.options);
        }
    }
};

module.exports = controller;
