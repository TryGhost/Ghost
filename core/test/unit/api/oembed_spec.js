const common = require('../../../server/lib/common');
const nock = require('nock');
const OembedAPI = require('../../../server/api/oembed');
const should = require('should');

describe('API: oembed', function () {
    describe('fn: read', function () {
        // https://oembed.com/providers.json only has schemes for https://reddit.com
        it('finds match for unlisted http scheme', function (done) {
            let requestMock = nock('https://www.reddit.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    html: 'test'
                });

            OembedAPI.read({url: 'http://www.reddit.com/r/pics/comments/8qi5oq/breathtaking_picture_of_jupiter_with_its_moon_io/'})
                .then((results) => {
                    should.exist(results);
                    should.exist(results.html);
                    done();
                }).catch(done);
        });

        it('finds match for schema-less urls', function (done) {
            let requestMock = nock('https://www.reddit.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    html: 'test'
                });

            OembedAPI.read({url: '//www.reddit.com/r/pics/comments/8qi5oq/breathtaking_picture_of_jupiter_with_its_moon_io/'})
                .then((results) => {
                    requestMock.isDone().should.be.true;
                    should.exist(results);
                    should.exist(results.html);
                    done();
                }).catch(done);
        });

        it('returns error for missing url', function (done) {
            OembedAPI.read({url: ''})
                .then(() => {
                    done(new Error('Fetch oembed without url should error'));
                }).catch((err) => {
                    (err instanceof common.errors.BadRequestError).should.eql(true);
                    done();
                });
        });

        it('returns error for unsupported provider', function (done) {
            OembedAPI.read({url: 'http://example.com/unknown'})
                .then(() => {
                    done(new Error('Fetch oembed with unknown url provider should error'));
                }).catch((err) => {
                    (err instanceof common.errors.ValidationError).should.eql(true);
                    done();
                });
        });

        it('returns error for fetch failure', function (done) {
            let requestMock = nock('https://www.youtube.com')
                .get('/oembed')
                .query(true)
                .reply(500);

            OembedAPI.read({url: 'https://www.youtube.com/watch?v=E5yFcdPAGv0'})
                .then(() => {
                    done(new Error('Fetch oembed with external failure should error'));
                }).catch((err) => {
                    (err instanceof common.errors.InternalServerError).should.eql(true);
                    done();
                });
        });
    });
});
