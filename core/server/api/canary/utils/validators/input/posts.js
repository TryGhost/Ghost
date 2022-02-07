const jsonSchema = require('../utils/json-schema');
const models = require('../../../../../models');
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidVisibilityFilter: 'Invalid filter in visibility_filter property'
};

const validateVisibility = async function (frame) {
    if (!frame.data.posts || !frame.data.posts[0]) {
        return Promise.resolve();
    }

    // validate visibility - not done at schema level because this can be an NQL query so needs model access
    const visibility = frame.data.posts[0].visibility;
    const visibilityFilter = frame.data.posts[0].visibility_filter;
    if (visibility) {
        if (!['public', 'members', 'paid', 'tiers'].includes(visibility)) {
            // check filter is valid
            try {
                await models.Member.findPage({filter: visibilityFilter, limit: 1});
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(new ValidationError({
                    message: tpl(messages.invalidVisibilityFilter),
                    property: 'visibility_filter'
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
