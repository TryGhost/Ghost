const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const config = require('../../../server/config');
const mailService = require('../../../server/services/mail');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

let request;

describe('Mail API', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'invites');
            });
    });

    beforeEach(function () {
        sinon.stub(mailService.GhostMailer.prototype, 'send').resolves({message: 'sent'});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can send mail', function () {
        return request
            .post(localUtils.API.getApiQuery('mail/'))
            .set('Origin', config.get('url'))
            .send({
                mail: [{
                    message: {
                        to: 'joe@example.com',
                        subject: 'testemail',
                        html: '<p>This</p>'
                    }
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.mail);
                should.exist(jsonResponse.mail[0].message);
                should.exist(jsonResponse.mail[0].status);

                jsonResponse.mail[0].status.should.eql({message: 'sent'});
                jsonResponse.mail[0].message.subject.should.eql('testemail');
                mailService.GhostMailer.prototype.send.called.should.be.true();
            });
    });
});
