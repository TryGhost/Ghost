const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const helpers = require('../../../core/frontend/helpers');
const labs = require('../../../core/server/services/labs');
const handlebars = require('../../../core/frontend/services/theme-engine/engine').handlebars;

describe('Match helper', function () {
    before(function () {
        handlebars.registerHelper('match', helpers.match);
    });

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        sinon.stub(labs, 'isSet').returns(true);
    });

    function shouldCompileToExpected(templateString, hash, expected) {
        const template = handlebars.compile(templateString);
        const result = template(hash);

        result.should.eql(expected);
    }

    describe('{{#match}} (block)', function () {
        before(function () {
            handlebars.registerHelper('foreach', helpers.foreach);
        });

        it('{{#match title "=" "Hello World"}} works when true', function () {
            const templateString = '{{#match title "=" "Hello World"}}true{{else}}false{{/match}}';
            const hash = {
                title: 'Hello World'
            };

            const expected = 'true';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{#match title "=" "Hello World"}} works when false', function () {
            const templateString = '{{#match title "=" "Hello World"}}true{{else}}false{{/match}}';
            const hash = {
                title: 'Goodbye World'
            };

            const expected = 'false';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{#match title "!=" "Hello World"}} works when true', function () {
            const templateString = '{{#match title "!=" "Hello World"}}true{{else}}false{{/match}}';
            const hash = {
                title: 'Goodbye World'
            };

            const expected = 'true';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{#match title "!=" "Hello World"}} works when false', function () {
            const templateString = '{{#match title "!=" "Hello World"}}true{{else}}false{{/match}}';
            const hash = {
                title: 'Hello World'
            };

            const expected = 'false';

            shouldCompileToExpected(templateString, hash, expected);
        });
    });

    describe('{{match}} (inline)', function () {
        before(function () {
            handlebars.registerHelper('foreach', helpers.foreach);
        });

        it('{{match title "=" "Hello World"}} works when true', function () {
            const templateString = '{{match title "=" "Hello World"}}';
            const hash = {
                title: 'Hello World'
            };

            const expected = 'true';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{match title "=" "Hello World"}} works when false', function () {
            const templateString = '{{match title "=" "Hello World"}}';
            const hash = {
                title: 'Goodbye World'
            };

            const expected = 'false';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{match title "!=" "Hello World"}} works when true', function () {
            const templateString = '{{match title "!=" "Hello World"}}';
            const hash = {
                title: 'Goodbye World'
            };

            const expected = 'true';

            shouldCompileToExpected(templateString, hash, expected);
        });

        it('{{match title "!=" "Hello World"}} works when false', function () {
            const templateString = '{{match title "!=" "Hello World"}}';
            const hash = {
                title: 'Hello World'
            };

            const expected = 'false';

            shouldCompileToExpected(templateString, hash, expected);
        });
    });
});
