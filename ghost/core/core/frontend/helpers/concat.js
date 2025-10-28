const {SafeString} = require('../services/handlebars');

module.exports = function concat(...args) {
    const options = args.pop();
    const separator = options.hash.separator || '';

    // Flatten arrays - if an argument is an array, spread its elements
    const flattenedArgs = args.reduce((acc, arg) => {
        if (Array.isArray(arg)) {
            return acc.concat(arg);
        }
        return acc.concat([arg]);
    }, []);

    return new SafeString(flattenedArgs.join(separator));
};
