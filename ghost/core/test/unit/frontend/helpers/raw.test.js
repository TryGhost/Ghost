const should = require('should');
const raw = require('../../../../core/frontend/helpers/raw');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

let defaultGlobals;

function compile(templateString) {
    const template = handlebars.compile(templateString);
    template.with = (locals = {}, globals) => {
        globals = globals || defaultGlobals;

        return template(locals, globals);
    };

    return template;
}

describe('{{raw}} helper', function () {
    before(function () {
        handlebars.registerHelper('raw', raw);
    });

    it('can correctly compile space', function () {
        compile('{{{{raw}}}} {{{{/raw}}}}')
            .with({})
            .should.eql(' ');
    });

    it('can correctly ignore handlebars', function () {
        compile('{{{{raw}}}}{{test}}{{{{/raw}}}}')
            .with({tag: {}})
            .should.eql('{{test}}');
    });

    it('can correctly compile recursive', function () {
        compile('{{{{raw}}}}{{{{raw}}}}{{{{/raw}}}}{{{{/raw}}}}')
            .with({tag: {}})
            .should.eql('{{{{raw}}}}{{{{/raw}}}}');
    });
});
