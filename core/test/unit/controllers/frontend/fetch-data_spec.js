/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should   = require('should'),
    sinon    = require('sinon'),
    Promise  = require('bluebird'),

    // Stuff we are testing
    api      = require('../../../../server/api'),
    fetchData = require('../../../../server/controllers/frontend/fetch-data'),

    sandbox = sinon.sandbox.create();

describe('fetchData', function () {
    var apiSettingsStub,
        apiPostsStub;

    beforeEach(function () {
        apiPostsStub = sandbox.stub(api.posts, 'browse').returns(new Promise.resolve({}));
        apiSettingsStub = sandbox.stub(api.settings, 'read');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('valid postsPerPage', function () {
        beforeEach(function () {
            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: '10'
                }]
            }));
        });

        it('Adds limit & includes to options by default', function (done) {
            fetchData({}).then(function () {
                apiSettingsStub.calledOnce.should.be.true;
                apiPostsStub.calledOnce.should.be.true;
                apiPostsStub.firstCall.args[0].should.be.an.Object;
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.have.property('limit', 10);
                done();
            }).catch(done);
        });

        it('Throws error if no options are passed', function (done) {
            fetchData().then(function () {
                done('Should have thrown an error here');
            }).catch(function (err) {
                should.exist(err);
                done();
            });
        });
    });

    describe('invalid postsPerPage', function () {
        beforeEach(function () {
            apiSettingsStub.withArgs('postsPerPage').returns(Promise.resolve({
                settings: [{
                    key: 'postsPerPage',
                    value: '-1'
                }]
            }));
        });

        it('Will not add limit if postsPerPage is not valid', function (done) {
            fetchData({}).then(function () {
                apiSettingsStub.calledOnce.should.be.true;
                apiPostsStub.calledOnce.should.be.true;
                apiPostsStub.firstCall.args[0].should.be.an.Object;
                apiPostsStub.firstCall.args[0].should.have.property('include');
                apiPostsStub.firstCall.args[0].should.not.have.property('limit');

                done();
            }).catch(done);
        });
    });
});
