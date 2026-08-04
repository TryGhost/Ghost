const _ = require('lodash');
const {SafeString} = require('../services/handlebars');

module.exports = function concat(...args) {
    const options = args.pop();
    const separator = options.hash.separator || '';

    // Flatten arrays - if an argument is an array, spread its elements
    const flattenedArgs = args.flat();

    const escapedArgs = flattenedArgs.map(arg => (arg instanceof SafeString ? arg.toString() : _.escape(arg)));

    return new SafeString(escapedArgs.join(separator));
};
