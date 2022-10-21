const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

function shouldCompileToExpected(templateString, hash, expected) {
    const template = handlebars.compile(templateString);
    const result = template(hash);

    result.should.eql(expected);
}

module.exports = {
    shouldCompileToExpected
};
