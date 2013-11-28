/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require('underscore'),
    path = require('path'),

    // Stuff we are testing
    config   = require('../../server/config'),
    template = require('../../server/helpers/template');

describe('Helpers Template', function () {

    var testTemplatePath = 'core/test/utils/fixtures/',
        themeTemplatePath = 'core/test/utils/fixtures/theme',
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
                activeTheme: path.join(process.cwd(), testTemplatePath),
                helperTemplates: path.join(process.cwd(), testTemplatePath)
            };
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
        }).then(null, done);
    });

    it("loads templates from themes first", function (done) {
        var compileSpy = sandbox.spy(template, 'compileTemplate'),
            pathsStub;

        should.exist(template.loadTemplate, 'load template function exists');

        // In order for the test to work, need to replace the path to the template
        pathsStub = sandbox.stub(config, "paths", function () {
            return {
                activeTheme: path.join(process.cwd(), themeTemplatePath),
                helperTemplates: path.join(process.cwd(), testTemplatePath)
            };
        });

        template.loadTemplate('test').then(function (templateFn) {
            // test that compileTemplate was called with the expected path
            compileSpy.calledOnce.should.equal(true);
            compileSpy.calledWith(path.join(process.cwd(), themeTemplatePath, 'partials', 'test.hbs')).should.equal(true);

            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld Themed</h1>');

            compileSpy.restore();
            pathsStub.restore();

            done();
        }).then(null, done);
    });
});