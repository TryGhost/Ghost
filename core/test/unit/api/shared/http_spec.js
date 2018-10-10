const should = require('should');
const sinon = require('sinon');
const models = require('../../../../server/models');
const shared = require('../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/http', function () {
    let req;
    let res;
    let next;

    before(models.init);

    beforeEach(function () {
        req = sandbox.stub();
        res = sandbox.stub();
        next = sandbox.stub();

        req.body = {
            a: 'a'
        };

        res.status = sandbox.stub();
        res.json = sandbox.stub();
        res.set = sandbox.stub();
        res.send = sandbox.stub();

        sandbox.stub(shared.headers, 'get');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('check options', function (done) {
        shared.http(function (frame) {
            Object.keys(frame).should.eql([
                'original',
                'options',
                'data',
                'user',
                'file',
                'files'
            ]);
            frame.data.should.eql({a: 'a'});
            frame.options.should.eql({
                context: {
                    api_key_user: null,
                    api_key_id: null,
                    user: null
                }
            });

            done();
        })(req, res, next);
    });

    it('calls the apiImpl and sets the owner user as context.api_key_user when req.api_key is present and valid', function (done) {
        req.api_key = models.ApiKey.forge({id: 'CREAM'});

        const ownerUser = models.User.forge({name: 'iona'});
        sandbox.stub(models.User, 'getOwnerUser')
            .resolves(ownerUser);

        shared.http(function (frame) {
            frame.options.context.api_key_user.should.eql(ownerUser);
            done();
        })(req, res, next);
    });

    it('sets the null as context.api_key_user when req.api_key is not present', function (done) {
        shared.http(function (frame) {
            should.equal(frame.options.context.api_key_user, null);
            done();
        })(req, res, next);
    });

    it('api response is fn', function (done) {
        const response = sandbox.stub().callsFake(function (req, res, next) {
            should.exist(req);
            should.exist(res);
            should.exist(next);
            apiImpl.calledOnce.should.be.true();
            res.json.called.should.be.false();
            done();
        });

        const apiImpl = sandbox.stub().resolves(response);
        shared.http(apiImpl)(req, res, next);
    });

    it('api response is fn', function (done) {
        const apiImpl = sandbox.stub().resolves('data');

        next.callsFake(done);

        res.json.callsFake(function () {
            shared.headers.get.calledOnce.should.be.true();
            res.status.calledOnce.should.be.true();
            res.send.called.should.be.false();
            done();
        });

        shared.http(apiImpl)(req, res, next);
    });
});
