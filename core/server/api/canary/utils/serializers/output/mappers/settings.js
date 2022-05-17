const _ = require('lodash');

module.exports = (attrs) => {
    if (Array.isArray(attrs)) {
        return attrs.map((setting) => {
            return _.pick(setting, ['key', 'value']);
        });
    }

    return attrs;
};
