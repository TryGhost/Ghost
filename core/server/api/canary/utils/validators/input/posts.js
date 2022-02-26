const jsonSchema = require('../utils/json-schema');
const models = require('../../../../../models');
const {ValidationError} = require('@tryghost/errors');
const omit = require('lodash/omit');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidVisibilityFilter: 'Invalid filter in visibility_filter property'
};

const IGNORE_FIELDS = ['game_url', 'is_game', 'is_video', 'video_url'];

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
        const f = {
            ...frame,
            data: {
                posts: [omit(frame.data.posts[0], IGNORE_FIELDS)]
            }
        };

        return jsonSchema.validate(apiConfig, f).then(() => {
            return validateVisibility(f);
        });
    },
    edit(apiConfig, frame) {
        const f = {
            ...frame,
            data: {
                posts: [omit(frame.data.posts[0], IGNORE_FIELDS)]
            }
        };

        return jsonSchema.validate(apiConfig, f).then(() => {
            return validateVisibility(f);
        });
    }
};
