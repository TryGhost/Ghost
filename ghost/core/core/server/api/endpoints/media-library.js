const models = require('../../models');

module.exports = {
    docName: 'media_library',
    browse: {
        options: [
            'filter',
            'limit',
            'page',
            'debug'
        ],
        permissions: true,
        query(frame) {
            return models.Image.findPage(frame.options);
        }
    }
};
