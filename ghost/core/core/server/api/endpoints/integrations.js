const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const getIntegrationsServiceInstance = require('../../services/integrations/integrations-service');

const messages = {
    resourceNotFound: '{resource} not found.'
};

const integrationsService = getIntegrationsServiceInstance({
    IntegrationModel: models.Integration,
    ApiKeyModel: models.ApiKey
});

module.exports = {
    docName: 'integrations',
    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'include',
            'limit'
        ],
        validation: {
            options: {
                include: {
                    values: ['api_keys', 'webhooks']
                }
            }
        },
        query({options}) {
            return models.Integration.findPage(options);
        }
    },
    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        data: [
            'id'
        ],
        options: [
            'include'
        ],
        validation: {
            data: {
                id: {
                    required: true
                }
            },
            options: {
                include: {
                    values: ['api_keys', 'webhooks']
                }
            }
        },
        query({data, options}) {
            return models.Integration.findOne(data, Object.assign(options, {require: true}))
                .catch((e) => {
                    if (e instanceof models.Integration.NotFoundError) {
                        throw new errors.NotFoundError({
                            message: tpl(messages.resourceNotFound, {resource: 'Integration'})
                        });
                    }
                });
        }
    },
    edit: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        data: [
            'name',
            'icon_image',
            'description',
            'webhooks'
        ],
        options: [
            'id',
            'keyid',
            'include'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                include: {
                    values: ['api_keys', 'webhooks']
                }
            }
        },
        query({data, options}) {
            return integrationsService.edit(data, options);
        }
    },
    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        data: [
            'name',
            'icon_image',
            'description',
            'webhooks'
        ],
        options: [
            'include'
        ],
        validation: {
            data: {
                name: {
                    required: true
                }
            },
            options: {
                include: {
                    values: ['api_keys', 'webhooks']
                }
            }
        },
        query({data, options}) {
            const dataWithApiKeys = Object.assign({
                api_keys: [
                    {type: 'content'},
                    {type: 'admin'}
                ]
            }, data);
            return models.Integration.add(dataWithApiKeys, options);
        }
    },
    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
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
        query({options}) {
            return models.Integration.destroy(Object.assign(options, {require: true}))
                .catch((e) => {
                    if (e instanceof models.Integration.NotFoundError) {
                        return Promise.reject(new errors.NotFoundError({
                            message: tpl(messages.resourceNotFound, {resource: 'Integration'})
                        }));
                    }
                });
        }
    }
};
