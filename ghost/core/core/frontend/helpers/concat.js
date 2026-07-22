const {SafeString} = require('../services/handlebars');

module.exports = function concat(...args) {
    const options = args.pop();
    const separator = options.hash.separator || '';

    // Flatten arrays - if an argument is an array, spread its elements
    const flattenedArgs = args.flat();

    return new SafeString(flattenedArgs.join(separator));
};
