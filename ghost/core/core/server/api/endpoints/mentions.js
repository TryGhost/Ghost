const mentions = require('../../services/mentions');

module.exports = {
    docName: 'mentions',
    browse: {
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page',
            'debug'
        ],
        permissions: false,
        query(frame) {
            return mentions.controller.browse(frame);
        }
    }
};
