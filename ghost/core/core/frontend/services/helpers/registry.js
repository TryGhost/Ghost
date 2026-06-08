const handlebars = require('./handlebars');

// Internal Cache
const registry = {};

const registerHelper = (name, helperFn) => {
    if (registry[name]) {
        return;
    }

    registry[name] = helperFn;

    if (helperFn.async) {
        handlebars.registerAsyncThemeHelper(name, helperFn);
    } else {
        handlebars.registerThemeHelper(name, helperFn);
    }

    if (helperFn.alias) {
        registerHelper(helperFn.alias, helperFn);
    }
};

const registerAlias = (alias, name) => {
    registerHelper(alias, registry[name]);
};

module.exports = {
    registerAlias,
    registerHelper
};
