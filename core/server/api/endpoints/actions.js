const models = require('../../models');

module.exports = {
    docName: 'actions',

    browse: {
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
