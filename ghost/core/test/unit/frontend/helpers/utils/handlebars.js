const handlebars = require('../../../../../core/frontend/services/theme-engine/engine').handlebars;

module.exports.shouldCompileToExpected = (templateString, hash, expected) => {
    const template = handlebars.compile(templateString);
    const result = template(hash);

    result.should.eql(expected);
};

module.exports.registerHelper = (name) => {
    const helper = require(`../../../../../core/frontend/helpers/${name}`);
    handlebars.registerHelper(name, helper);
};
