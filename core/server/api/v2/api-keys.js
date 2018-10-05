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
    }
};
