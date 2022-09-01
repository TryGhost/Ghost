const serialize = require('./serialize');
const Promise = require('bluebird');

module.exports = (event, model) => {
    const payload = {};

    if (model) {
        return serialize(event, model)
            .then((result) => {
                Object.assign(payload, result);

                return payload;
            });
    }

    return Promise.resolve(payload);
};
