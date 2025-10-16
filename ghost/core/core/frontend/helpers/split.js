const {SafeString} = require('../services/handlebars');

module.exports = function split(...args) {
    const options = args.pop();
    const data = options.data || {};
    const separator = options.hash.separator || ',';
    let string = args[0];
    if (string instanceof SafeString) {
        string = string.toString();
    }
    if (string === '') {
        return [];
    }

    const result = string.split(separator).map(item => new SafeString(item));

    if (options.fn) {
        // we're in block mode
        return options.fn(result, {
            data: data,
            blockParams: [result]
        });
    } else {
        // we're in inline mode
        return result;
    }
};
