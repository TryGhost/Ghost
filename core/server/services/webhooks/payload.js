const serialize = require('./serialize');

module.exports = (event, model) => {
    const payload = {};

    if (model) {
        Object.assign(payload, serialize(event, model));
    }

    return payload;
};
