const assert = require('node:assert/strict');
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
        assert.equal(compile('{{{{raw}}}} {{{{/raw}}}}')
            .with({}), ' ');
    });

    it('can correctly ignore handlebars', function () {
        assert.equal(compile('{{{{raw}}}}{{test}}{{{{/raw}}}}')
            .with({tag: {}}), '{{test}}');
    });

    it('can correctly compile recursive', function () {
        assert.equal(compile('{{{{raw}}}}{{{{raw}}}}{{{{/raw}}}}{{{{/raw}}}}')
            .with({tag: {}}), '{{{{raw}}}}{{{{/raw}}}}');
    });
});
