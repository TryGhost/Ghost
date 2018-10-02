module.exports = {
    all(apiConfig, options) {
        if (options.modelOptions.filter) {
            if (options.modelOptions.filter.match(/page:\w+\+?/)) {
                options.modelOptions.filter = options.modelOptions.filter.replace(/page:\w+\+?/, '');
            }

            if (options.modelOptions.filter) {
                options.modelOptions.filter = options.modelOptions.filter + '+page:true';
            } else {
                options.modelOptions.filter = 'page:true';
            }
        } else {
            options.modelOptions.filter = 'page:true';
        }
    }
};
