const _ = require('lodash');

module.exports = {
    edit(apiConfig, frame) {
        // CASE: allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(frame.data)) {
            frame.data = {settings: [{key: frame.data, value: frame.options}]};
        }

        // CASE: transform objects/arrays into string (we store stringified objects in the db)
        // @TODO: This belongs into the model layer?
        frame.data.settings.forEach((setting) => {
            if (_.isObject(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }
        });
    }
};
