const should = require('should');
const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

const slice = require('../../../../core/frontend/helpers/slice');
const match = require('../../../../core/frontend/helpers/match');

const configUtils = require('../../../utils/configUtils');

let defaultGlobals;

function compile(templateString) {
    const template = handlebars.compile(templateString);
    template.with = (locals = {}, globals) => {
        globals = globals || defaultGlobals;

        return template(locals, globals);
    };

    return template;
}

describe('{{slice}} helper', function () {
    before(function () {
        handlebars.registerHelper('slice', slice);
        handlebars.registerHelper('match', match);
        configUtils.config.set('url', 'https://siteurl.com');

        defaultGlobals = {
            data: {
                site: {
                    url: configUtils.config.get('url')
                }
            }
        };
    });

    it('can correctly slice nothing', function () {
        compile('{{slice}}')
            .with({})
            .should.eql('');
    });

    it('can correctly slice things that resolve to empty', function () {
        compile('{{slice tag.slug start=2}}')
            .with({tag: {}})
            .should.eql('');
    });

    it('can slice simple strings', function () {
        compile('{{slice "@ Mail" start=2}}')
            .with({})
            .should.eql('Mail');
    });

    it('can slice simple strings with end', function () {
        compile('{{slice "@ Mail" start=0 end=2}}')
            .with({})
            .should.eql('@ ');
    });

    it('can slice simple strings with end', function () {
        compile('{{slice @site.url start=0 end=5}}')
            .with({})
            .should.eql('https');
    });

    it('can silently return empty string with non integer start', function () {
        compile('{{slice "- Test" start="12"}}')
            .with({})
            .should.eql('');
    });

    it('can ignore non integer end', function () {
        compile('{{slice "- Test" start=2 end="end"}}')
            .with({})
            .should.eql('Test');
    });

    it('can work with minus start value', function () {
        compile('{{slice "Test ->" start=-2}}')
            .with({})
            .should.eql('->');
    });

    it('can be used as sub expression', function () {
        compile('{{#match (slice "- Test" start=0 end=2) "- "}}true{{else}}false{{/match}}')
            .with({})
            .should.eql('true');
    });
});
