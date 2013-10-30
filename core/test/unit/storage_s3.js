/*globals describe, beforeEach, afterEach, it*/
var AWS = require('aws-sdk'),
    assert = require('assert'),
    fs = require('fs'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    s3Store = require('../../server/controllers/storage/s3');

describe('S3 File Storage', function() {

    var image, putObject, config, awsConfigUpdate, putResult;

    beforeEach(function () {
        putResult = {};

        on = {
            on: sinon.stub().yields(putResult).returns({ send: function (){}})
        };

        putObject = sinon.stub().returns(on);
        var mockS3 = {
            client: {
                putObject: putObject
            }
        };

        awsConfigUpdate = sinon.stub();
        AWS.config = {
            update: awsConfigUpdate
        };

        sinon.stub(AWS, 'S3').returns(mockS3);
        sinon.stub(fs, 'createReadStream').returns('STREAM');

        config = {
            s3: {
                bucket: 'BUCKET',
                region: 'REGION',
                accessKeyId: 'ACCESSKEYID',
                secretAccessKey: 'SECRET'
            }
        };

        image = {
            path: "tmp/123456.jpg",
            name: "IMAGE.jpg",
            type: "image/jpeg",
            hash: "HASH"
        };
    });

    afterEach(function () {
        AWS.S3.restore();
        fs.createReadStream.restore();
    });

    it('should return correct url', function (done) {
        s3Store.save(null, image, config).then(function (url) {
            url.should.equal('https://s3.amazonaws.com/BUCKET/ghost/images/HASH');
            return done();
        }); 
    });

    it('should createReadStream correctly', function (done) {
        s3Store.save(null, image, config).then(function (url) {
            fs.createReadStream.calledOnce.should.be.true;
            fs.createReadStream.args[0][0].should.equal('tmp/123456.jpg');
            return done();
        }); 
    });

    it('should call putObject correctly', function (done) {
        s3Store.save(null, image, config).then(function (url) {
            url.should.equal('https://s3.amazonaws.com/BUCKET/ghost/images/HASH');
            putObject.calledOnce.should.be.true;
            putObject.args[0][0].should.eql({ Bucket: 'BUCKET', Key: 'ghost/images/HASH', Body: 'STREAM' });
            return done();
        }); 
    });

    it('should set AWS region', function (done) {
        s3Store.save(null, image, config).then(function (url) {
            awsConfigUpdate.calledOnce.should.be.true;
            var expectedConfig = {
                region: 'REGION',
                accessKeyId: 'ACCESSKEYID',
                secretAccessKey: 'SECRET'
            };

            awsConfigUpdate.args[0][0].should.eql(expectedConfig);
            return done();
        }); 
    });

    it('should raise error if putObject fails', function (done) {
        putResult = { 
            error: { 
                code: 'SigningError', 
                name: 'SigningError' 
            } 
        };   
   
        var on = {
            on: sinon.stub().yields(putResult).returns({ send: function (){}})
        };

        putObject = sinon.stub().returns(on);
        var mockS3 = {
            client: {
                putObject: putObject
            }
        };

        AWS.S3.returns(mockS3);

        s3Store.save(null, image, config).then(function (url) {
            assert(false);
            return done();
        }).otherwise(function(e) {
            assert.deepEqual(e, { code: 'SigningError', name: 'SigningError' });
            return done();
        }); 
    });
});
