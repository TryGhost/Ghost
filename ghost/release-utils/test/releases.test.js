// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const lib = require('../lib');

describe('Releases', function () {
    describe('uploadZip', function () {
        it('no options', function (done) {
            try {
                lib.releases.uploadZip();
            } catch (err) {
                err.message.should.eql('Missing options: zipPath, github, github.token, userAgent, uri');
                return done();
            }

            throw new Error('should fail');
        });

        it('missing options', function (done) {
            try {
                lib.releases.uploadZip({zipPath: 'test', github: {}});
            } catch (err) {
                err.message.should.eql('Missing options: github.token, userAgent, uri');
                return done();
            }

            throw new Error('should fail');
        });
    });
});
