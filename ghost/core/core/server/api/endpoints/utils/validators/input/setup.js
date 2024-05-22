const debug = require('@tryghost/debug')('api:endpoints:utils:validators:input:updateSetup');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    notTheBlogOwner: 'You are not the site owner.'
};

module.exports = {
    updateSetup(apiConfig, frame) {
        debug('resetPassword');

        if (!frame.options.context || !frame.options.context.user) {
            throw new errors.NoPermissionError({message: tpl(messages.notTheBlogOwner)});
        }
    }
};
