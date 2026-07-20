const {SafeString, escapeExpression} = require('../services/handlebars');

function escape(value) {
    if (value instanceof SafeString) {
        return value.toHTML();
    }

    return escapeExpression(value);
}

module.exports = function concat(...args) {
    const options = args.pop();
    const separator = options.hash.separator || '';

    // Flatten arrays - if an argument is an array, spread its elements
    const flattenedArgs = args.flat();

    return new SafeString(flattenedArgs.map(escape).join(escape(separator)));
};
