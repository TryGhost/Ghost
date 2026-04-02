const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../../../core/server/services/member-welcome-emails/constants');

describe('MemberWelcomeEmailService', function () {
    let serviceModule;
    let MemberWelcomeEmailService;
    let service;
    let automatedEmailFindOneStub;
    let emailDesignSettingFindOneStub;
    let rendererRenderStub;
    let mailSendStub;

    function createModel(attrs, relations = {}) {
        return {
            id: attrs.id,
            get(key) {
                return attrs[key];
            },
            related(name) {
                return relations[name] || {id: null};
            },
            toJSON() {
                return attrs;
            }
        };
    }

    beforeEach(function () {
        automatedEmailFindOneStub = sinon.stub();
        emailDesignSettingFindOneStub = sinon.stub();
        rendererRenderStub = sinon.stub().resolves({
            html: '<p>Hello</p>',
            text: 'Hello',
            subject: 'Rendered subject'
        });
        mailSendStub = sinon.stub().resolves();

        serviceModule = rewire('../../../../../core/server/services/member-welcome-emails/service');
        serviceModule.__set__('AutomatedEmail', {findOne: automatedEmailFindOneStub});
        serviceModule.__set__('EmailDesignSetting', {findOne: emailDesignSettingFindOneStub});
        serviceModule.__set__('Newsletter', {getDefaultNewsletter: sinon.stub().resolves(null)});
        serviceModule.__set__('settingsCache', {
            get: sinon.stub().callsFake((key) => {
                if (key === 'title') {
                    return 'Test Site';
                }
                if (key === 'accent_color') {
                    return '#ff0000';
                }
                return null;
            })
        });
        serviceModule.__set__('urlUtils', {
            urlFor: sinon.stub().returns('https://example.com/')
        });
        serviceModule.__set__('emailAddressService', {
            init: sinon.stub()
        });
        serviceModule.__set__('mail', {
            GhostMailer: class {
                send(...args) {
                    return mailSendStub(...args);
                }
            }
        });
        serviceModule.__set__('MemberWelcomeEmailRenderer', class {
            render(...args) {
                return rendererRenderStub(...args);
            }
        });

        MemberWelcomeEmailService = serviceModule.__get__('MemberWelcomeEmailService');
        service = new MemberWelcomeEmailService({t: key => key});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('loads welcome emails with related design settings and forwards fresh design settings on send', async function () {
        automatedEmailFindOneStub
            .onFirstCall()
            .resolves(createModel({
                id: 'welcome-free',
                lexical: '{}',
                subject: 'Welcome!',
                status: 'active',
                email_design_setting_id: 'design-1'
            }, {
                emailDesignSetting: createModel({button_color: 'accent'})
            }))
            .onSecondCall()
            .resolves(null);
        emailDesignSettingFindOneStub.resolves(createModel({
            button_color: '#123456',
            footer_content: '<p>Footer</p>'
        }));

        await service.loadMemberWelcomeEmails();
        await service.send({
            member: {
                name: 'Jamie',
                email: 'jamie@example.com',
                uuid: 'member-uuid'
            },
            memberStatus: 'free'
        });

        sinon.assert.calledWithExactly(
            automatedEmailFindOneStub.firstCall,
            {slug: MEMBER_WELCOME_EMAIL_SLUGS.free},
            {withRelated: ['emailDesignSetting']}
        );
        sinon.assert.calledWithExactly(
            automatedEmailFindOneStub.secondCall,
            {slug: MEMBER_WELCOME_EMAIL_SLUGS.paid},
            {withRelated: ['emailDesignSetting']}
        );
        sinon.assert.calledOnceWithExactly(emailDesignSettingFindOneStub, {id: 'design-1'});
        sinon.assert.calledWithMatch(rendererRenderStub, {
            designSettings: {
                button_color: '#123456',
                footer_content: '<p>Footer</p>'
            },
            lexical: '{}',
            subject: 'Welcome!'
        });
        sinon.assert.calledOnce(mailSendStub);
    });

    it('forwards fresh design settings when sending a test email', async function () {
        automatedEmailFindOneStub.resolves(createModel({
            id: 'welcome-free',
            email_design_setting_id: 'design-2'
        }, {
            emailDesignSetting: createModel({show_badge: true})
        }));
        emailDesignSettingFindOneStub.resolves(createModel({
            show_badge: false,
            show_header_title: false
        }));

        await service.sendTestEmail({
            automatedEmailId: 'welcome-free',
            email: 'test@example.com',
            lexical: '{}',
            subject: 'Welcome!'
        });

        sinon.assert.calledOnceWithExactly(
            automatedEmailFindOneStub,
            {id: 'welcome-free'},
            {withRelated: ['emailDesignSetting']}
        );
        sinon.assert.calledOnceWithExactly(emailDesignSettingFindOneStub, {id: 'design-2'});
        sinon.assert.calledWithMatch(rendererRenderStub, {
            designSettings: {
                show_badge: false,
                show_header_title: false
            },
            lexical: '{}',
            subject: 'Welcome!'
        });

        assert.equal(mailSendStub.firstCall.args[0].subject, '[Test] Rendered subject');
    });
});
