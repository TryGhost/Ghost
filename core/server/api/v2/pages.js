const models = require('../../models');

module.exports = {
    docName: 'pages',
    browse: {
        options: [
            'include',
            'filter',
            'status',
            'fields',
            'formats',
            'page',
            'limit',
            'order',
            'debug'
        ],
        validation: {
            options: {
                include: {
                    values: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles']
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.Post.findPage(frame.options);
        }
    }
};
