const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

describe('member-welcome-emails service logging', function () {
    let serviceWrapper;
    let loggingStub;
    let automatedEmailFindOneStub;
    let configGetStub;

    beforeEach(function () {
        serviceWrapper = rewire('../../../../../core/server/services/member-welcome-emails/service.js');

        loggingStub = {
            info: sinon.stub()
        };
        automatedEmailFindOneStub = sinon.stub();
        configGetStub = sinon.stub().returns('');

        serviceWrapper.__set__('logging', loggingStub);
        serviceWrapper.__set__('emailAddressService', {init: sinon.stub()});
        serviceWrapper.__set__('mail', {
            GhostMailer: class {
                async send() {}
            }
        });
        serviceWrapper.__set__('MemberWelcomeEmailRenderer', class {
            async render() {
                return {
                    html: '<p>Welcome</p>',
                    text: 'Welcome',
                    subject: 'Welcome to Ghost'
                };
            }
        });
        serviceWrapper.__set__('settingsCache', {
            get: sinon.stub().returns('Ghost')
        });
        serviceWrapper.__set__('urlUtils', {
            urlFor: sinon.stub().returns('http://localhost:2368/')
        });
        serviceWrapper.__set__('config', {
            get: configGetStub
        });
        serviceWrapper.__set__('AutomatedEmail', {
            findOne: automatedEmailFindOneStub
        });

        automatedEmailFindOneStub.callsFake(({slug}) => {
            if (!slug) {
                return null;
            }
            return {
                id: 'ae-1',
                get(field) {
                    const values = {
                        lexical: '{"root":{"children":[],"type":"root","version":1}}',
                        subject: 'Welcome',
                        status: 'active',
                        sender_name: null,
                        sender_email: null,
                        sender_reply_to: null
                    };
                    return values[field];
                }
            };
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('emits structured log when welcome email send starts', async function () {
        serviceWrapper.init();
        await serviceWrapper.api.loadMemberWelcomeEmails();
        await serviceWrapper.api.send({
            member: {
                id: 'member-1',
                uuid: 'uuid-1',
                email: 'member@example.com',
                name: 'Member Name'
            },
            memberStatus: 'free'
        });

        sinon.assert.calledOnce(loggingStub.info);
        const log = loggingStub.info.firstCall.args[0];
        assert.equal(log.event, 'member_welcome_email.send.started');
        assert.equal(log.member_email, 'member@example.com');
        assert.equal(log.member_name, 'Member Name');
        assert.equal(log.member_id, 'member-1');
        assert.equal(log.member_uuid, 'uuid-1');
    });
});
