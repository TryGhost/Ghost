// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const tpl = require('../');

describe('tpl', function () {
    it('Can handle a plain string', function () {
        const string = 'My template';
        const result = tpl(string);

        result.should.eql('My template');
    });

    it('Can handle a string with data', function () {
        const string = 'Go visit {url}';
        const data = {url: 'https://example.com'};

        let result = tpl(string, data);

        result.should.eql('Go visit https://example.com');
    });

    it('Can mix interpolation handlebars in the same message', function () {
        const string = '{{#get}} helper took {totalMs}ms to complete';
        const data = {
            totalMs: '500'
        };

        let result = tpl(string, data);
        result.should.eql('{{#get}} helper took 500ms to complete');
    });

    it('Can mix interpolation with handlebars-block helpers without escaping', function () {
        const string = '{{#{helperName}}} helper took {totalMs}ms to complete';

        const data = {
            helperName: 'get',
            totalMs: '500'
        };

        let result = tpl(string, data);
        result.should.eql('{{#get}} helper took 500ms to complete');
    });

    it('ignores 3 braces', function () {
        const string = 'The {{{helperName}}} helper is not available.';
        const data = {
            helperName: 'get',
            totalMs: '500'
        };
        let result = tpl(string, data);
        result.should.eql('The {{{helperName}}} helper is not available.');
    });

    it('has a simple bare minimum escaping needed', function () {
        const string = 'The {\\{{helperName}}} helper is not available.';
        const data = {
            helperName: 'get',
            totalMs: '500'
        };
        let result = tpl(string, data);
        result.should.eql('The {{get}} helper is not available.');
    });

    it('Can handle escaped left braces', function () {
        const string = 'The \\{\\{{helperName}}} helper is not available.';
        const data = {
            helperName: 'get',
            totalMs: '500'
        };
        let result = tpl(string, data);
        result.should.eql('The {{get}} helper is not available.');
    });

    it('Can handle escaped right braces as well', function () {
        const string = 'The \\{\\{{helperName}\\}\\} helper is not available.';
        const data = {
            helperName: 'get',
            totalMs: '500'
        };
        let result = tpl(string, data);
        result.should.eql('The {{get}} helper is not available.');
    });

    it('Returns a sensible error if data is missing', function () {
        const string = '{helperName} helper took {totalMs}ms to complete';
        const data = {
            totalMs: '500'
        };

        let resultFn = () => {
            tpl(string, data);
        };
        resultFn.should.throw('helperName is not defined');
    });
});
