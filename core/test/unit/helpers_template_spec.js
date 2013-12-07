/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should    = require('should'),
    sinon     = require('sinon'),
    when      = require('when'),
    _         = require('underscore'),
    path      = require('path'),

    // Stuff we are testing
    config   = require('../../server/config'),
    api      = require('../../server/api'),
    template = require('../../server/helpers/template');

describe('Helpers Template', function () {

    var testTemplatePath = 'core/test/utils/fixtures/',
        sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("can compile a template", function (done) {
        var testTemplate = path.join(process.cwd(), testTemplatePath, 'test.hbs');

        should.exist(template.compileTemplate, 'Template Compiler exists');

        template.compileTemplate(testTemplate).then(function (templateFn) {
            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld</h1>');
            done();
        }).then(null, done);
    });

    it("loads templates for helpers", function (done) {
        var compileSpy = sandbox.spy(template, 'compileTemplate'),
            pathsStub;

        should.exist(template.loadTemplate, 'load template function exists');

        // In order for the test to work, need to replace the path to the template
        pathsStub = sandbox.stub(config, "paths", function () {
            return {
                // Forcing the theme path to be the same
                themePath: path.join(process.cwd(), testTemplatePath),
                helperTemplates: path.join(process.cwd(), testTemplatePath)
            };
        });
        apiStub = sandbox.stub(api.settings , 'read', function () {
            return when({value: 'casper'});
        });

        template.loadTemplate('test').then(function (templateFn) {
            compileSpy.restore();
            pathsStub.restore();
            // test that compileTemplate was called with the expected path
            compileSpy.calledOnce.should.equal(true);
            compileSpy.calledWith(path.join(process.cwd(), testTemplatePath, 'test.hbs')).should.equal(true);
            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld</h1>');

            done();
        }).otherwise(done);
    });

    it("loads templates from themes first", function (done) {
        var compileSpy = sandbox.spy(template, 'compileTemplate'),
            pathsStub;

        should.exist(template.loadTemplate, 'load template function exists');

        // In order for the test to work, need to replace the path to the template
        pathsStub = sandbox.stub(config, "paths", function () {
            return {
                // Forcing the theme path to be the same
                themePath: path.join(process.cwd(), testTemplatePath),
                helperTemplates: path.join(process.cwd(), testTemplatePath)
            };
        });
        apiStub = sandbox.stub(api.settings , 'read', function () {
            return when({value: 'theme'});
        });

        template.loadTemplate('test').then(function (templateFn) {
            // test that compileTemplate was called with the expected path
            compileSpy.calledOnce.should.equal(true);
            compileSpy.calledWith(path.join(process.cwd(), testTemplatePath, 'theme', 'partials', 'test.hbs')).should.equal(true);

            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld Themed</h1>');

            compileSpy.restore();
            pathsStub.restore();

            done();
        }).then(null, done);
    });
});