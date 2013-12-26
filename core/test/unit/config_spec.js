/*globals describe, it, beforeEach, afterEach */

var should  = require('should'),
    sinon   = require('sinon'),
    when    = require('when'),

    config  = require('../../server/config');

describe('Config', function () {

    describe('Theme', function () {

        var sandbox,
            settingsStub;

        beforeEach(function (done) {
            sandbox = sinon.sandbox.create();

            var settings = {'read': function read() {}};

            settingsStub = sandbox.stub(settings, 'read', function () {
                return when({value: 'casper'});
            });

            config.theme.update(settings, 'http://my-ghost-blog.com')
                .then(done)
                .otherwise(done);
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('should have all of the values', function () {
            var themeConfig = config.theme();

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover');

            // Check values are as we expect
            themeConfig.should.have.property('url', 'http://my-ghost-blog.com');
            themeConfig.should.have.property('title', 'casper');
            themeConfig.should.have.property('description', 'casper');
            themeConfig.should.have.property('logo', 'casper');
            themeConfig.should.have.property('cover', 'casper');

            // Check settings.read gets called exactly 4 times
            settingsStub.callCount.should.equal(4);

        });
    });

});