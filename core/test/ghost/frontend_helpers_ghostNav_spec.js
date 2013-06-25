/*globals describe, beforeEach, it*/
var should = require('should'),
    sinon = require('sinon'),
    _ = require('underscore'),
    path = require('path'),
    NavHelper = require('../../frontend/helpers/navigation');

describe('Navigation Helper', function () {
    var navTemplatePath = path.join(process.cwd(), 'core/frontend/views/nav.hbs');

    should.exist(NavHelper, "Navigation helper exists");

    it('can compile the nav template', function (done) {
        var helper = new NavHelper(navTemplatePath);

        helper.compileTemplate().then(function () {
            should.exist(helper.navTemplateFunc);
            _.isFunction(helper.navTemplateFunc).should.equal(true);

            done();
        }, done);
    });

    it('can render nav items', function () {
        var helper = new NavHelper(function (data) { return "rendered " + data.links.length; }),
            templateSpy = sinon.spy(helper, 'navTemplateFunc'),
            fakeNavItems = [{
                title: 'test1',
                url: '/test1'
            }, {
                title: 'test2',
                url: '/test2'
            }],
            rendered;

        rendered = helper.renderNavItems(fakeNavItems);

        // Returns a string returned from navTemplateFunc
        should.exist(rendered);
        rendered.should.equal("rendered 2");

        templateSpy.calledWith({ links: fakeNavItems }).should.equal(true);
    });

    it('can register with ghost', function (done) {
        var fakeGhost = {
                paths: function () {
                    return {
                        frontendViews: path.join(process.cwd(), 'core/frontend/views/')
                    };
                },

                registerThemeHelper: function () {
                    return;
                }
            },
            registerStub = sinon.stub(fakeGhost, 'registerThemeHelper');

        NavHelper.registerWithGhost(fakeGhost).then(function () {
            registerStub.called.should.equal(true);

            done();
        }, done);
    });
});