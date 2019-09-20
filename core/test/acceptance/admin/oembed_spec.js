const nock = require('nock');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils/index');
const config = require('../../../server/config/index');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Oembed API', function () {
    let ghostServer, request;

    before(function () {
        return ghost()
            .then((_ghostServer) => {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            });
    });

    it('can fetch an embed', function (done) {
        let requestMock = nock('https://www.youtube.com')
            .get('/oembed')
            .query(true)
            .reply(200, {
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
                thumbnail_width: 480,
                width: 480,
                author_url: 'https://www.youtube.com/user/gorillaz',
                height: 270,
                thumbnail_height: 360,
                provider_name: 'YouTube',
                title: 'Gorillaz - Humility (Official Video)',
                provider_url: 'https://www.youtube.com/',
                author_name: 'Gorillaz',
                version: '1.0',
                thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
                type: 'video'
            });

        request.get(localUtils.API.getApiQuery('oembed/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE5yFcdPAGv0'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                requestMock.isDone().should.be.true();
                should.exist(res.body.html);
                done();
            });
    });
});
