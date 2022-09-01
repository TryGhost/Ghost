const {SafeString} = require('../services/handlebars');

module.exports = function concat(...args) {
    const options = args.pop();
    const separator = options.hash.separator || '';

    return new SafeString(args.join(separator));
};
