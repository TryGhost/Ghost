const models = require('../../models');

module.exports = {
    docName: 'comments',

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Comment.edit({
                id: frame.data.comments[0].id,
                status: frame.data.comments[0].status
            }, frame.options);
        }
    }
};
