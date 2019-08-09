const models = require('../../models');

module.exports = {
    docName: 'actions',

    browse: {
        options: [
            'page',
            'limit',
            'fields'
        ],
        data: [
            'id',
            'type'
        ],
        validation: {
            id: {
                required: true
            },
            type: {
                required: true,
                values: ['resource', 'actor']
            }
        },
        permissions: true,
        query(frame) {
            if (frame.data.type === 'resource') {
                frame.options.withRelated = ['actor'];
                frame.options.filter = `resource_id:${frame.data.id}`;
            } else {
                frame.options.withRelated = ['resource'];
                frame.options.filter = `actor_id:${frame.data.id}`;
            }

            return models.Action.findPage(frame.options);
        }
    }
};
