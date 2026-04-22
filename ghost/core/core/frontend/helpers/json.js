const {SafeString} = require('../services/handlebars');

module.exports = function json(value, options) {
    let payload = value;

    if (arguments.length === 1 && value && value.hash) {
        payload = value.hash;
    } else if (options && options.hash && Object.keys(options.hash).length > 0) {
        payload = options.hash;
    }

    const raw = JSON.stringify(payload);

    if (raw === undefined) {
        return new SafeString('null');
    }

    const serialized = raw
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

    return new SafeString(serialized);
};
