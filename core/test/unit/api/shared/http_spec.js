const should = require('should');
const sinon = require('sinon');
const shared = require('../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/http', function () {
    let req;
    let res;
    let next;

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

    it('check options', function () {
        const apiImpl = sandbox.stub().resolves();
        shared.http(apiImpl)(req, res, next);

        Object.keys(apiImpl.args[0][0]).should.eql([
            'data',
            'query',
            'params',
            'file',
            'files',
            'apiOptions'
        ]);

        apiImpl.args[0][0].data.should.eql({a: 'a'});
        apiImpl.args[0][0].apiOptions.should.eql({
            context: {
                user: null,
                client: null,
                client_id: null
            }
        });
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
