const _ = require('lodash');

module.exports = {
    read(apiConfig, frame) {
        if (frame.options.key === 'codeinjection_head') {
            frame.options.key = 'ghost_head';
        }

        if (frame.options.key === 'codeinjection_foot') {
            frame.options.key = 'ghost_foot';
        }
    },

    edit(apiConfig, frame) {
        // CASE: allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(frame.data)) {
            frame.data = {settings: [{key: frame.data, value: frame.options}]};
        }

        frame.data.settings.forEach((setting) => {
            // CASE: transform objects/arrays into string (we store stringified objects in the db)
            // @TODO: This belongs into the model layer. We should stringify before saving and parse when fetching from db.
            // @TODO: Fix when dropping v0.1
            if (_.isObject(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }

            if (setting.value === '0' || setting.value === '1') {
                setting.value = !!+setting.value;
            }

            if (setting.key === 'codeinjection_head') {
                setting.key = 'ghost_head';
            }

            if (setting.key === 'codeinjection_foot') {
                setting.key = 'ghost_foot';
            }
        });
    }
};
