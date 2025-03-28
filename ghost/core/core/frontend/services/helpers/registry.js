const glob = require('glob');
const path = require('path');

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
};

const registerDir = (helperPath) => {
    let helperFiles = glob.sync('!(index).js', {cwd: helperPath});
    helperFiles.forEach((helper) => {
        const name = helper.replace(/.js$/, '');
        const fn = require(path.join(helperPath, helper));

        registerHelper(name, fn);

        if (fn.alias) {
            registerHelper(fn.alias, fn);
        }
    });
};

const registerAlias = (alias, name) => {
    registerHelper(alias, registry[name]);
};

module.exports = {
    registerAlias,
    registerHelper,
    registerDir
};
