const models = require('../../../models');
const i18n = require('../../../../shared/i18n');
const errors = require('@tryghost/errors');

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
                    message: i18n.t('errors.api.resource.resourceNotFound', {
                        resource: 'Integration'
                    })
                });
            }
            return integration.toJSON();
        });
};

module.exports = getSchedulerIntegration;
