const _ = require('lodash');

module.exports = {
    edit(apiConfig, frame) {
        // CASE: allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(frame.data)) {
            frame.data = {settings: [{key: frame.data, value: frame.options}]};
        }

        // prepare data
        frame.data.settings.forEach((setting) => {
            if (!_.isString(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }
        });
    }
};
