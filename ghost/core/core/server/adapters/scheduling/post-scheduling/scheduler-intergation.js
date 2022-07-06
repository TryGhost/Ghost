const models = require('../../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    resourceNotFound: '{resource} not found.'
};

/**
 * @description Load the internal scheduler integration
 *
 * @return {Promise}
 */
const getSchedulerIntegration = function () {
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

module.exports = getSchedulerIntegration;
