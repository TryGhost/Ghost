const common = require('../../lib/common');
const models = require('../../models');

module.exports = {
    docName: 'api_keys',
    edit: {
        permissions: true,
        data: ['id'],
        validation: {
            data: {
                id: {
                    required: true
                }
            }
        },
        query({data, options}) {
            return models.ApiKey.refreshSecret(data, Object.assign({require: true}, options, {id: data.id}))
                .catch(models.ApiKey.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.resource.resourceNotFound', {resource: 'ApiKey'})
                    });
                });
        }
    },
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
            return models.ApiKey.destroy(Object.assign({require: true}, options, {id: data.id}))
                .catch(models.ApiKey.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.resource.resourceNotFound', {resource: 'ApiKey'})
                    });
                });
        }
    }
};
