const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    noUrlProvided: 'No url provided.'
};

module.exports = {
    read(apiConfig, frame) {
        if (!frame.data.url || !frame.data.url.trim()) {
            return Promise.reject(new errors.BadRequestError({
                message: tpl(messages.noUrlProvided)
            }));
        }
    }
};
