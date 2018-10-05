const models = require('../../models');

module.exports = {
    docName: 'api_keys',
    add: {
        permissions: true,
        data: ['integration_id', 'type'],
        validation: {
            data: {
                integration_id: {
                    required: true
                },
                type: {
                    required: true,
                    allowed: ['content', 'admin']
                }
            }
        },
        query({data, options}) {
            return models.ApiKey.add(data, options);
        }
    },
    destroy: {
        permissions: true,
        statusCode: 204,
        responseType: 'plain',
        data: ['id'],
        validation: {
            data: {
                id: {
                    required: true
                }
            }
        },
        query({data, options}) {
            return models.ApiKey.destroy(Object.assign({}, options, {id: data.id}));
        }
    }
};
