const jsonSchema = require('../utils/json-schema');
const models = require('../../../../../models');
const {ValidationError} = require('@tryghost/errors');
const i18n = require('../../../../../../shared/i18n');

const validateVisibility = async function (frame) {
    if (!frame.data.pages || !frame.data.pages[0]) {
        return Promise.resolve();
    }

    // validate visibility - not done at schema level because this can be an NQL query so needs model access
    const visibility = frame.data.pages[0].visibility;
    if (visibility) {
        if (!['public', 'members', 'paid'].includes(visibility)) {
            // check filter is valid
            try {
                await models.Member.findPage({filter: visibility, limit: 1});
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(new ValidationError({
                    message: i18n.t('errors.api.pages.invalidVisibilityFilter'),
                    property: 'visibility'
                }));
            }
        }

        return Promise.resolve();
    }
};

module.exports = {
    add(apiConfig, frame) {
        return jsonSchema.validate(...arguments).then(() => {
            return validateVisibility(frame);
        });
    },
    edit(apiConfig, frame) {
        return jsonSchema.validate(...arguments).then(() => {
            return validateVisibility(frame);
        });
    }
};
