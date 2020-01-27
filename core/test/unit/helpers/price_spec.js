const should = require('should');
const helpers = require.main.require('core/frontend/helpers');
const handlebars = require.main.require('core/frontend/services/themes/engine').handlebars;

function compile(templateString) {
    const template = handlebars.compile(templateString);
    template.with = (locals = {}, globals) => {
        return template(locals, globals);
    };

    return template;
}

describe('{{price}} helper', function () {
    before(function () {
        handlebars.registerHelper('price', helpers.price);
    });

    it('throws an error for no provided parameters', function () {
        (function compileWith() {
            compile('{{price}}')
                .with({});
        }).should.throw();
    });

    it('throws an error for undefined parameter', function () {
        (function compileWith() {
            compile('{{price @dont.exist}}')
                .with({});
        }).should.throw();
    });

    it('throws if argument is not a number', function () {
        (function compileWith() {
            compile('{{price "not_a_number"}}')
                .with({});
        }).should.throw();
    });

    it('will format decimal adjusted amount', function () {
        compile('{{price 2000}}')
            .with({})
            .should.equal('20');
    });
});

