const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

class FrontendDataService {
    constructor({IntegrationModel}) {
        this.IntegrationModel = IntegrationModel;
        this.frontendKey = null;
    }

    async getFrontendKey() {
        if (this.frontendKey) {
            return this.frontendKey;
        }

        try {
            const key = await this.IntegrationModel.getInternalFrontendKey();
            this.frontendKey = key.toJSON().api_keys[0].secret;
        } catch (error) {
            this.frontendKey = null;
            logging.error(new errors.InternalServerError({message: 'Unable to find the internal frontend key', err: error}));
        }

        return this.frontendKey;
    }
}

module.exports = FrontendDataService;
