var should = require('should'), // jshint ignore:line
    nock = require('nock'),
    configUtils = require('../../../utils/configUtils'),
    gravatar = require('../../../../server/lib/image/gravatar');

describe('lib/image: gravatar', function () {
    beforeEach(function () {
        configUtils.set('privacy:useGravatar', true);
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('can successfully lookup a gravatar url', function (done) {
        nock('https://www.gravatar.com')
            .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=404&r=x')
            .reply(200);

        gravatar.lookup({email: 'exists@example.com'}).then(function (result) {
            should.exist(result);
            should.exist(result.image);
            result.image.should.eql('//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x');

            done();
        }).catch(done);
    });

    it('can handle a non existant gravatar', function (done) {
        nock('https://www.gravatar.com')
            .get('/avatar/3a2963a39ebba98fb0724a1db2f13d63?s=250&d=404&r=x')
            .reply(404);

        gravatar.lookup({email: 'invalid@example.com'}).then(function (result) {
            should.exist(result);
            should.not.exist(result.image);

            done();
        }).catch(done);
    });

    it('will timeout', function (done) {
        nock('https://www.gravatar.com')
            .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=404&r=x')
            .delay(15)
            .reply(200);

        gravatar.lookup({email: 'exists@example.com'}, 10).then(function (result) {
            should.not.exist(result);
            done();
        }).catch(done);
    });
});
