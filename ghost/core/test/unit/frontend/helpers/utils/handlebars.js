const assert = require('assert/strict');
const handlebars = require('../../../../../core/frontend/services/theme-engine/engine').handlebars;

module.exports.shouldCompileToExpected = (templateString, hash, expected) => {
    const template = handlebars.compile(templateString);
    const result = template(hash);

    assert.equal(result, expected);
};

module.exports.shouldCompileToError = (templateString, hash, error) => {
    const template = handlebars.compile(templateString);

    assert.throws(() => {
        return template(hash);
    }, error);
};

module.exports.registerHelper = (name) => {
    const helper = require(`../../../../../core/frontend/helpers/${name}`);
    handlebars.registerHelper(name, helper);
};
