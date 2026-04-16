const adapterManager = require('../../services/adapter-manager');
const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    resourceNotFound: '{resource} not found.'
};

exports.createAdapter = function createAdapter() {
    return adapterManager.getAdapter('scheduling');
};

/**
 * @description Load the internal scheduler integration
 *
 * @return {Promise}
 */
exports.getSchedulerIntegration = function () {
    return models.Integration.findOne({slug: 'ghost-scheduler'}, {withRelated: 'api_keys'})
        .then((integration) => {
            if (!integration) {
                throw new errors.NotFoundError({
                    message: tpl(messages.resourceNotFound, {resource: 'Integration'})
                });
            }
            return integration.toJSON();
        });
};
