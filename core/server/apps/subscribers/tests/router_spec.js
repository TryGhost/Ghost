var should = require('should'),
    router = require('../lib/router');

describe('UNIT: Apps Subscriber Router', function () {
    it('[failure] email is invalid, ensure it`s sanitized', function (done) {
        var req = {
            body: {
                email: 'something-evil'
            }
        }, res = {};

        router.storeSubscriber(req, res, function next(err) {
            req.body.email.should.eql('');
            should.exist(err);
            done();
        });
    });
});
