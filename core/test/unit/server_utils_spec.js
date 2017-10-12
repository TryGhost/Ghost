var should = require('should'), // jshint ignore:line
    nock = require('nock'),
    configUtils = require('../utils/configUtils'),
    gravatar = require('../../server/utils/gravatar'),
    utils = require('../../server/utils');

describe('Server Utilities', function () {
    describe('Safe String', function () {
        var safeString = utils.safeString,
            options = {};

        it('should remove beginning and ending whitespace', function () {
            var result = safeString(' stringwithspace ', options);
            result.should.equal('stringwithspace');
        });

        it('can handle null strings', function () {
            var result = safeString(null);
            result.should.equal('');
        });

        it('should remove non ascii characters', function () {
            var result = safeString('howtowin✓', options);
            result.should.equal('howtowin');
        });

        it('should replace spaces with dashes', function () {
            var result = safeString('how to win', options);
            result.should.equal('how-to-win');
        });

        it('should replace most special characters with dashes', function () {
            var result = safeString('a:b/c?d#e[f]g!h$i&j(k)l*m+n,o;{p}=q\\r%s<t>u|v^w~x£y"z@1.2`3', options);
            result.should.equal('a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-1-2-3');
        });

        it('should replace all of the html4 compat symbols in ascii except hyphen and underscore', function () {
            // note: This is missing the soft-hyphen char that isn't much-liked by linters/browsers/etc,
            // it passed the test before it was removed
            var result = safeString('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿');
            result.should.equal('_-c-y-ss-c-a-r-deg-23up-1o-1-41-23-4');
        });

        it('should replace all of the foreign chars in ascii', function () {
            var result = safeString('ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ');
            result.should.equal('aaaaaaaeceeeeiiiidnoooooxouuuuuthssaaaaaaaeceeeeiiiidnooooo-ouuuuythy');
        });

        it('should remove special characters at the beginning of a string', function () {
            var result = safeString('.Not special', options);
            result.should.equal('not-special');
        });

        it('should remove apostrophes ', function () {
            var result = safeString('how we shouldn\'t be', options);
            result.should.equal('how-we-shouldnt-be');
        });

        it('should convert to lowercase', function () {
            var result = safeString('This has Upper Case', options);
            result.should.equal('this-has-upper-case');
        });

        it('should convert multiple dashes into a single dash', function () {
            var result = safeString('This :) means everything', options);
            result.should.equal('this-means-everything');
        });

        it('should remove trailing dashes from the result', function () {
            var result = safeString('This.', options);
            result.should.equal('this');
        });

        it('should handle pound signs', function () {
            var result = safeString('WHOOPS! I spent all my £ again!', options);
            result.should.equal('whoops-i-spent-all-my-again');
        });

        it('should properly handle unicode punctuation conversion', function () {
            var result = safeString('に間違いがないか、再度確認してください。再読み込みしてください。', options);
            result.should.equal('nijian-wei-iganaika-zai-du-que-ren-sitekudasai-zai-du-miip-misitekudasai');
        });

        it('should not lose or convert dashes if options are passed with truthy importing flag', function () {
            var result,
                options = {importing: true};
            result = safeString('-slug-with-starting-ending-and---multiple-dashes-', options);
            result.should.equal('-slug-with-starting-ending-and---multiple-dashes-');
        });

        it('should still remove/convert invalid characters when passed options with truthy importing flag', function () {
            var result,
                options = {importing: true};
            result = safeString('-slug-&with-✓-invalid-characters-に\'', options);
            result.should.equal('-slug--with--invalid-characters-ni');
        });
    });

    describe('gravatar-lookup', function () {
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
                .delay(11)
                .reply(200);

            gravatar.lookup({email: 'exists@example.com'}, 10).then(function (result) {
                should.not.exist(result);
                done();
            }).catch(done);
        });
    });
});
