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
            set: sandbox.stub(),
            redirect: function (statusCode, url) {
                res.set.calledOnce.should.eql(true);
                statusCode.should.eql(302);
                url.should.eql('/blog/welcome-ghost');
                done();
            }
        };

        router.checkIfAMPIsEnabled(req, res);
    });
});
