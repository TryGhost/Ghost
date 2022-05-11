const models = require('../../models');

const allowedIncludes = ['count.posts', 'count.members'];

module.exports = {
    docName: 'newsletters',

    browse: {
        options: [
            'include',
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Newsletter.findPage(frame.options);
        }
    }
};
