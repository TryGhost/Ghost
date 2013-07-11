/*globals describe, beforeEach, it*/
var should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require('underscore'),
    handlebars = require('express-hbs').handlebars,
    path = require('path'),
    helpers = require('../../frontend/helpers'),
    Ghost = require('../../ghost');

describe('Core Helpers', function () {

    var ghost;

    beforeEach(function () {
        ghost = new Ghost();
    });


    describe('Navigation Helper', function () {

        it('can render nav items', function (done) {
            var templateSpy = sinon.spy(function (data) { return "rendered " + data.links.length; }),
                compileSpy = sinon.stub(ghost, 'compileTemplate').returns(when.resolve(templateSpy)),
                fakeNavItems = [{
                    title: 'test1',
                    url: '/test1'
                }, {
                    title: 'test2',
                    url: '/test2'
                }],
                rendered;

            helpers.loadCoreHelpers(ghost).then(function () {

                should.exist(handlebars.helpers.nav);

                rendered = handlebars.helpers.nav.call({navItems: fakeNavItems});

                // Returns a string returned from navTemplateFunc
                should.exist(rendered);
                rendered.string.should.equal("rendered 2");

                compileSpy.called.should.equal(true);
                templateSpy.called.should.equal(true);
                templateSpy.calledWith({ links: fakeNavItems }).should.equal(true);


                compileSpy.restore();

                done();
            }).then(null, done);
        });
    });
});