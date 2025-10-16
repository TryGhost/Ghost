module.exports = function split(...args) {
    const options = args.pop();
    const data = options.data || {};
    const separator = options.hash.separator !== undefined ? options.hash.separator : ',';
    let string = args[0];
    
    // Handle undefined and null inputs
    if (string === undefined || string === null) {
        const emptyResult = [];
        if (options.fn) {
            return options.fn(emptyResult, {
                data: data,
                blockParams: [emptyResult]
            });
        } else {
            return emptyResult;
        }
    }
    
    // Convert non-string types to string (e.g. numbers)
    if (typeof string !== 'string') {
        string = String(string);
    }
    
    // Handle empty string input
    if (string === '') {
        const emptyResult = [];
        if (options.fn) {
            return options.fn(emptyResult, {
                data: data,
                blockParams: [emptyResult]
            });
        } else {
            return emptyResult;
        }
    }

    const result = string.split(separator);
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
