const {NotFoundError, InternalServerError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    notFound: '{resource} not found.'
};

class IntegrationsService {
    constructor({IntegrationModel, ApiKeyModel}) {
        this.IntegrationModel = IntegrationModel;
        this.ApiKeyModel = ApiKeyModel;
    }

    async edit(data, options) {
        if (options.keyid) {
            const model = await this.ApiKeyModel.findOne({id: options.keyid});

            if (!model) {
                throw new NotFoundError({
                    message: tpl(messages.notFound, {
                        resource: 'ApiKey'
                    })
                });
            }
            try {
                await this.ApiKeyModel.refreshSecret(model.toJSON(), Object.assign({}, options, {id: options.keyid}));

                return await this.IntegrationModel.findOne({id: options.id}, {
                    withRelated: ['api_keys', 'webhooks']
                });
            } catch (err) {
                throw new InternalServerError({
                    err: err
                });
            }
        }

        try {
            return await this.IntegrationModel.edit(data, Object.assign(options, {require: true}));
        } catch (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                throw new NotFoundError({
                    message: tpl(messages.notFound, {
                        resource: 'Integration'
                    })
                });
            }

            throw error;
        }
    }
}

/**
 * @returns {IntegrationsService} instance of the PostsService
 */
const getIntegrationsServiceInstance = ({IntegrationModel, ApiKeyModel}) => {
    return new IntegrationsService({IntegrationModel, ApiKeyModel});
};

module.exports = getIntegrationsServiceInstance;
