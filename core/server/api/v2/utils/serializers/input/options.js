const _ = require('lodash');

const trimAndLowerCase = (params) => {
    params = params || '';
    if (_.isString(params)) {
        params = params.split(',');
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

module.exports = {
    all(apiConfig, options, local = {forModel: true}) {
        options.modelOptions = _.cloneDeep(options.apiOptions);

        if (options.modelOptions.include) {
            // No need to validate the values again, happened already in validators
            options.modelOptions.include = trimAndLowerCase(options.modelOptions.include);

            if (local.forModel) {
                options.modelOptions.withRelated = options.modelOptions.include;
                delete options.modelOptions.include;
            }
        }

        if (options.modelOptions.fields) {
            options.modelOptions.fields = trimAndLowerCase(options.modelOptions.fields);

            options.modelOptions.columns = options.modelOptions.fields;
            delete options.modelOptions.fields;
        }

        if (options.modelOptions.formats) {
            options.modelOptions.formats = trimAndLowerCase(options.modelOptions.formats);
        }

        if (options.modelOptions.formats && options.modelOptions.columns) {
            options.modelOptions.columns = options.modelOptions.columns.concat(options.modelOptions.formats);
        }
    }
};
