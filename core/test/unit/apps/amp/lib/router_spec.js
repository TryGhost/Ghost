var sinon = require('sinon'),
    router = require('../../../../../server/apps/amp/lib/router'),
    configUtils = require('../../../../utils/configUtils'),
    testUtils = require('../../../../utils'),
    sandbox = sinon.sandbox.create();

describe('UNIT: Apps Amp Router', function () {
    afterEach(function () {
        configUtils.restore();
        sandbox.restore();
    });

    it('blog has subdirectory and amp is disabled', function (done) {
        configUtils.set({
            theme: {
                amp: false
            }
        });

        var req = {
            originalUrl: '/blog/welcome-ghost/amp',
            body: {
                post: {
                    title: testUtils.DataGenerator.forModel.posts[0]
                }
            }
        }, res = {
            send: function (message) {
                message.should.eql('Page not found');
                done();
            },
            set: sandbox.stub(),
            status: function (statusCode) {
                res.set.calledOnce.should.eql(true);
                statusCode.should.eql(404);
                return {send: res.send};
            }
        };

        router.checkIfAMPIsEnabled(req, res);
    });
});
