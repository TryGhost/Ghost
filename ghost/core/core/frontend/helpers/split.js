const {SafeString} = require('handlebars');

function renderResult(result, options, data) {
    if (options && typeof options.fn === 'function') {
        return options.fn(result, {data, blockParams: [result]});
    }
    return result;
}

module.exports = function split(...args) {
    const options = args.pop();
    const data = options.data || {};
    const separator = options.hash.separator !== undefined ? options.hash.separator : ',';
    let string = args[0];
    
    // Handle undefined and null inputs
    if (string === undefined || string === null) {
        return renderResult([], options, data);
    }
    
    // Convert non-string types to string (e.g. numbers)
    if (typeof string !== 'string') {
        string = String(string);
    }
    
    // Handle empty string input
    if (string === '') {
        return renderResult([], options, data);
    }
    
    // Filter out all empty strings
    const result = string.split(separator)
        .filter(item => item !== '')
        .map(item => new SafeString(item));

    if (result.length === 0) {
        return renderResult([], options, data);
    }

    return renderResult(result, options, data);
};
