const {EmailRenderer} = require('../');
const assert = require('assert/strict');
const cheerio = require('cheerio');
const {createModel, createModelClass} = require('./utils');
const linkReplacer = require('@tryghost/link-replacer');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {HtmlValidate} = require('html-validate');
const crypto = require('crypto');

async function validateHtml(html) {
    const htmlvalidate = new HtmlValidate({
        extends: [
            'html-validate:document',
            'html-validate:standard'
        ],
        rules: {
            // We need deprecated attrs for legacy tables in older email clients
            'no-deprecated-attr': 'off',

            // Don't care that the first <hx> isn't <h1>
            'heading-level': 'off'
        },
        elements: [
            'html5',
            // By default, html-validate requires the 'lang' attribute on the <html> tag. We don't really want that for now.
            {
                html: {
                    attributes: {
                        lang: {
                            required: false
                        }
                    }
                }
            }
        ]
    });
    const report = await htmlvalidate.validateString(html);

    // Improve debugging and show a snippet of the invalid HTML instead of just the line number or a huge HTML-dump
    const parsedErrors = [];

    if (!report.valid) {
        const lines = html.split('\n');
        const messages = report.results[0].messages;

        for (const item of messages) {
            if (item.severity !== 2) {
                // Ignore warnings
                continue;
            }
            const start = Math.max(item.line - 4, 0);
            const end = Math.min(item.line + 4, lines.length - 1);

            const _html = lines.slice(start, end).map(l => l.trim()).join('\n');
            parsedErrors.push(`${item.ruleId}: ${item.message}\n   At line ${item.line}, col ${item.column}\n   HTML-snippet:\n${_html}`);
        }
    }

    // Fail if invalid HTML
    assert.equal(report.valid, true, 'Expected valid HTML without warnings, got errors:\n' + parsedErrors.join('\n\n'));
}

const createUnsubscribeUrl = (uuid) => {
    return `https://example.com/unsubscribe/?uuid=${uuid}&key=456`;
};

const getMembersValidationKey = () => {
    return 'members-key';
};
// stub the t function so that we don't need to load the i18n module
// actually, no, this is a terrible option, because then we don't actually get interpolation.
// we should probably just load the i18n module

// load the i18n module
const i18nLib = require('@tryghost/i18n');
const i18n = i18nLib('en', 'newsletter');
const t = (key, options) => {
    return i18n.t(key, options);
};

const i18nFr = i18nLib('fr', 'newsletter');
const tFr = (key, options) => {
    return i18nFr.t(key, options);
};

describe('Email renderer', function () {
    let logStub;

    beforeEach(function () {
        logStub = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('buildReplacementDefinitions', function () {
        let emailRenderer;
        let newsletter;
        let member;
        let labsEnabled = false;

        beforeEach(function () {
            labsEnabled = false;
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => labsEnabled
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                    }
                },
                settingsHelpers: {getMembersValidationKey,createUnsubscribeUrl},
                t: t
            });
            newsletter = createModel({
                uuid: 'newsletteruuid'
            });
            member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'free'
            };  
        });

        it('returns the unsubscribe header replacement by default', function () {
            const html = 'Hello world';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{list_unsubscribe\\}%%/g');
            assert.equal(replacements[0].id, 'list_unsubscribe');
            const unsubscribeUrl = createUnsubscribeUrl(member.uuid);
            assert.equal(replacements[0].getValue(member), unsubscribeUrl);
        });

        it('returns a replacement if it is used', function () {
            const html = 'Hello world %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns a replacement only once if used multiple times', function () {
            const html = 'Hello world %%{uuid}%% And %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns correct first name', function () {
            const html = 'Hello %%{first_name}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[0].id, 'first_name');
            assert.equal(replacements[0].getValue(member), 'Test');
        });

        it('returns correct unsubscribe url', function () {
            const html = 'Hello %%{unsubscribe_url}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{unsubscribe_url\\}%%/g');
            assert.equal(replacements[0].id, 'unsubscribe_url');
            const unsubscribeUrl = createUnsubscribeUrl(member.uuid);
            assert.equal(replacements[0].getValue(member), unsubscribeUrl);
        });

        it('returns correct name', function () {
            const html = 'Hello %%{name}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{name\\}%%/g');
            assert.equal(replacements[0].id, 'name');
            assert.equal(replacements[0].getValue(member), 'Test User');
        });

        it('returns hidden class for missing name', function () {
            member.name = '';
            const html = 'Hello %%{name_class}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{name_class\\}%%/g');
            assert.equal(replacements[0].id, 'name_class');
            assert.equal(replacements[0].getValue(member), 'hidden');
        });

        it('returns empty class for available name', function () {
            const html = 'Hello %%{name_class}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{name_class\\}%%/g');
            assert.equal(replacements[0].id, 'name_class');
            assert.equal(replacements[0].getValue(member), '');
        });

        it('returns correct email', function () {
            const html = 'Hello %%{email}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{email\\}%%/g');
            assert.equal(replacements[0].id, 'email');
            assert.equal(replacements[0].getValue(member), 'test@example.com');
        });

        it('returns correct status', function () {
            const html = 'Hello %%{status}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{status\\}%%/g');
            assert.equal(replacements[0].id, 'status');
            assert.equal(replacements[0].getValue(member), 'free');
        });

        it('returns mapped complimentary status', function () {
            member.status = 'comped';
            const html = 'Hello %%{status}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{status\\}%%/g');
            assert.equal(replacements[0].id, 'status');
            assert.equal(replacements[0].getValue(member), 'complimentary');
        });

        it('returns mapped trialing status', function () {
            member.status = 'paid';
            member.subscriptions = [
                {
                    status: 'trialing',
                    trial_end_at: new Date(2050, 2, 13, 12, 0),
                    current_period_end: new Date(2023, 2, 13, 12, 0),
                    cancel_at_period_end: false
                }
            ];
            const html = 'Hello %%{status}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{status\\}%%/g');
            assert.equal(replacements[0].id, 'status');
            assert.equal(replacements[0].getValue(member), 'trialing');
        });

        it('returns manage_account_url', function () {
            const html = 'Hello %%{manage_account_url}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{manage_account_url\\}%%/g');
            assert.equal(replacements[0].id, 'manage_account_url');
            assert.equal(replacements[0].getValue(member), 'http://example.com/subdirectory/#/portal/account');
        });

        it('returns status_text', function () {
            const html = 'Hello %%{status_text}%%,';
            member.status = 'paid';
            member.subscriptions = [
                {
                    status: 'trialing',
                    trial_end_at: new Date(2050, 2, 13, 12, 0),
                    current_period_end: new Date(2023, 2, 13, 12, 0),
                    cancel_at_period_end: false
                }
            ];

            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{status_text\\}%%/g');
            assert.equal(replacements[0].id, 'status_text');
            assert.equal(replacements[0].getValue(member), 'Your free trial ends on 13 March 2050, at which time you will be charged the regular price. You can always cancel before then.');
        });

        it('returns correct createdAt', function () {
            const html = 'Hello %%{created_at}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{created_at\\}%%/g');
            assert.equal(replacements[0].id, 'created_at');
            assert.equal(replacements[0].getValue(member), '13 March 2023');
        });

        it('returns missing created at', function () {
            member.createdAt = null;
            const html = 'Hello %%{created_at}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{created_at\\}%%/g');
            assert.equal(replacements[0].id, 'created_at');
            assert.equal(replacements[0].getValue(member), '');
        });

        it('supports fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, (?:"|&quot;)there(?:"|&quot;)\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');
        });

        it('supports combination of multiple fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%, %%{first_name, "member"}%% %%{first_name}%% %%{first_name, "there"}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 4);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, (?:"|&quot;)there(?:"|&quot;)\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');

            assert.equal(replacements[1].token.toString(), '/%%\\{first_name, (?:"|&quot;)member(?:"|&quot;)\\}%%/g');
            assert.equal(replacements[1].id, 'first_name_3');
            assert.equal(replacements[1].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[1].getValue({name: ''}), 'member');

            assert.equal(replacements[2].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[2].id, 'first_name');
            assert.equal(replacements[2].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[2].getValue({name: ''}), '');
        });

        it('handles members uuid and key', function () {
            const html = '%%{uuid}%% %%{key}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 3);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');

            assert.equal(replacements[1].token.toString(), '/%%\\{key\\}%%/g');
            assert.equal(replacements[1].id, 'key');
            const memberHmac = crypto.createHmac('sha256', getMembersValidationKey()).update(member.uuid).digest('hex');
            assert.equal(replacements[1].getValue(member), memberHmac);
        });
    });

    describe('buildReplacementDefinitions with locales', function () {
        let emailRenderer;
        let newsletter;
        let member;
        let labsEnabled = true;
        beforeEach(function () {
            labsEnabled = false;
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => labsEnabled
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                    }
                },
                settingsHelpers: {getMembersValidationKey,createUnsubscribeUrl},
                t: t
            });
            newsletter = createModel({
                uuid: 'newsletteruuid'
            });
            member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'free'
            };  
        });

        it('handles dates when the locale is en-gb (default)', function () {
            const html = '%%{created_at}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{created_at\\}%%/g');
            assert.equal(replacements[0].id, 'created_at');
            assert.equal(replacements[0].getValue(member), '13 March 2023');
        });
        it('handles dates when the locale is fr', function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => labsEnabled
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                        if (key === 'locale') {
                            return 'fr';
                        }
                    }
                },
                settingsHelpers: {getMembersValidationKey,createUnsubscribeUrl},
                t: tFr
            });
            const html = '%%{created_at}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{created_at\\}%%/g');
            assert.equal(replacements[0].id, 'created_at');
            assert.equal(replacements[0].getValue(member), '13 mars 2023');
        });
        it('handles dates when the locale is en (US)', function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => labsEnabled
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                        if (key === 'locale') {
                            return 'en';
                        }
                    }
                },
                settingsHelpers: {getMembersValidationKey,createUnsubscribeUrl},
                t: t
            });
            const html = '%%{created_at}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{created_at\\}%%/g');
            assert.equal(replacements[0].id, 'created_at');
            assert.equal(replacements[0].getValue(member), '13 March 2023');
        });
    });
    describe('isMemberTrialing', function () {
        let emailRenderer;

        beforeEach(function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => false
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                    }
                },
                t: t
            });
        });

        it('Returns false for free member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'free'
            };

            const result = emailRenderer.isMemberTrialing(member);
            assert.equal(result, false);
        });

        it('Returns false for paid member without trial', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'active',
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: false
                    }
                ]
            };

            const result = emailRenderer.isMemberTrialing(member);
            assert.equal(result, false);
        });

        it('Returns true for trialing paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'trialing',
                        trial_end_at: new Date(2050, 2, 13, 12, 0),
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: false
                    }
                ],
                tiers: []
            };

            const result = emailRenderer.isMemberTrialing(member);
            assert.equal(result, true);
        });

        it('Returns false for expired trialing paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'trialing',
                        trial_end_at: new Date(2000, 2, 13, 12, 0),
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: false
                    }
                ],
                tiers: []
            };

            const result = emailRenderer.isMemberTrialing(member);
            assert.equal(result, false);
        });
    });

    describe('getMemberStatusText', function () {
        let emailRenderer;

        beforeEach(function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => false
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                    }
                },
                t: t
            });
        });

        it('Returns for free member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'free'
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, '');
        });

        it('Returns for active paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'active',
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: false
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your subscription will renew on 13 March 2023.');
        });

        it('Returns for canceled paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'active',
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: true
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your subscription has been canceled and will expire on 13 March 2023. You can resume your subscription via your account settings.');
        });

        it('Returns for expired paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'canceled',
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: true
                    }
                ],
                tiers: []
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your subscription has expired.');
        });

        it('Returns for trialing paid member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [
                    {
                        status: 'trialing',
                        trial_end_at: new Date(2050, 2, 13, 12, 0),
                        current_period_end: new Date(2023, 2, 13, 12, 0),
                        cancel_at_period_end: false
                    }
                ],
                tiers: []
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your free trial ends on 13 March 2050, at which time you will be charged the regular price. You can always cancel before then.');
        });

        it('Returns for infinite complimentary member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'comped',
                subscriptions: [],
                tiers: [
                    {
                        name: 'Silver',
                        expiry_at: null
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, '');
        });

        it('Returns for expiring complimentary member', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'comped',
                subscriptions: [],
                tiers: [
                    {
                        name: 'Silver',
                        expiry_at: new Date(2050, 2, 13, 12, 0)
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your subscription will expire on 13 March 2050.');
        });

        it('Returns for a paid member without subscriptions', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [],
                tiers: [
                    {
                        name: 'Silver',
                        expiry_at: new Date(2050, 2, 13, 12, 0)
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, 'Your subscription has been canceled and will expire on 13 March 2050. You can resume your subscription via your account settings.');
        });

        it('Returns for an infinte paid member without subscriptions', function () {
            const member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(2023, 2, 13, 12, 0),
                status: 'paid',
                subscriptions: [],
                tiers: [
                    {
                        name: 'Silver',
                        expiry_at: null
                    }
                ]
            };

            const result = emailRenderer.getMemberStatusText(member);
            assert.equal(result, '');
        });
    });

    describe('getSubject', function () {
        const emailRenderer = new EmailRenderer({
            urlUtils: {
                urlFor: () => 'http://example.com'
            },
            labs: {
                isSet: () => false
            }
        });

        it('returns a post with correct subject from meta', function () {
            const post = createModel({
                posts_meta: createModel({
                    email_subject: 'Test Newsletter'
                }),
                title: 'Sample Post',
                loaded: ['posts_meta']
            });
            let response = emailRenderer.getSubject(post);
            response.should.equal('Test Newsletter');
        });

        it('returns a post with correct subject from title', function () {
            const post = createModel({
                posts_meta: createModel({
                    email_subject: ''
                }),
                title: 'Sample Post',
                loaded: ['posts_meta']
            });
            let response = emailRenderer.getSubject(post);
            response.should.equal('Sample Post');
        });

        it('adds [TEST] prefix for test emails', function () {
            const post = createModel({
                posts_meta: createModel({
                    email_subject: ''
                }),
                title: 'Sample Post',
                loaded: ['posts_meta']
            });
            let response = emailRenderer.getSubject(post, true);
            response.should.equal('[TEST] Sample Post');
        });
    });

    describe('getFromAddress', function () {
        let siteTitle = 'Test Blog';
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return siteTitle;
                    }
                }
            },
            settingsHelpers: {
                getNoReplyAddress: () => {
                    return 'reply@example.com';
                }
            },
            labs: {
                isSet: () => false
            },
            emailAddressService: {
                getAddress(addresses) {
                    return addresses;
                }
            }
        });

        it('returns correct from address for newsletter', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost'
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Ghost" <ghost@example.com>');
        });

        it('defaults to site title and domain', function () {
            const newsletter = createModel({
                sender_email: '',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Test Blog" <reply@example.com>');
        });

        it('changes localhost domain to proper domain in development', function () {
            const newsletter = createModel({
                sender_email: 'example@localhost',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Test Blog" <localhost@example.com>');
        });

        it('ignores empty sender names', function () {
            siteTitle = '';
            const newsletter = createModel({
                sender_email: 'example@example.com',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('example@example.com');
        });
    });

    describe('getReplyToAddress', function () {
        let emailAddressService = {
            getAddress(addresses) {
                return addresses;
            },
            managedEmailEnabled: true
        };
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                }
            },
            settingsHelpers: {
                getMembersSupportAddress: () => {
                    return 'support@example.com';
                },
                getNoReplyAddress: () => {
                    return 'reply@example.com';
                }
            },
            labs: {
                isSet: () => false
            },
            emailAddressService
        });

        it('returns support address', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'support'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            response.should.equal('support@example.com');
        });

        it('[legacy] returns correct reply to address for newsletter', function () {
            emailAddressService.managedEmailEnabled = false;
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'newsletter'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            assert.equal(response, `"Ghost" <ghost@example.com>`);
            emailAddressService.managedEmailEnabled = true;
        });

        it('returns null when set to newsletter', function () {
            emailAddressService.managedEmailEnabled = true;
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'newsletter'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            assert.equal(response, null);
        });

        it('returns correct custom reply to address', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'anything@iwant.com'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            assert.equal(response, 'anything@iwant.com');
        });

        it('handles removed replyto addresses', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'anything@iwant.com'
            });
            emailAddressService.getAddress = ({from}) => {
                return {
                    from
                };
            };
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            assert.equal(response, null);
        });
    });

    describe('getSegments', function () {
        let emailRenderer = new EmailRenderer({
            renderers: {
                lexical: {
                    render: () => {
                        return '<p> Lexical Test</p>';
                    }
                },
                mobiledoc: {
                    render: () => {
                        return '<p> Mobiledoc Test</p>';
                    }
                }
            },
            getPostUrl: () => {
                return 'http://example.com/post-id';
            },
            labs: {
                isSet: () => false
            }
        });

        it('returns correct empty segment for post', async function () {
            let post = {
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = await emailRenderer.getSegments(post);
            response.should.eql([null]);

            post = {
                get: (key) => {
                    if (key === 'mobiledoc') {
                        return '{}';
                    }
                }
            };
            response = await emailRenderer.getSegments(post);
            response.should.eql([null]);
        });

        it('returns correct segments for post with members only card', async function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<p> Lexical Test <!--members-only--> members only section</p>';
                        }
                    }
                },
                getPostUrl: () => {
                    return 'http://example.com/post-id';
                },
                labs: {
                    isSet: () => false
                }
            });

            let post = {
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = await emailRenderer.getSegments(post);
            response.should.eql(['status:free', 'status:-free']);
        });

        it('returns correct segments for post with email card', async function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<html> <div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> </html>';
                        }
                    }
                },
                getPostUrl: () => {
                    return 'http://example.com/post-id';
                },
                labs: {
                    isSet: () => false
                }
            });

            let post = {
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = await emailRenderer.getSegments(post);
            response.should.eql(['status:free', 'status:-free']);
        });
    });

    describe('renderBody', function () {
        let renderedPost;
        let postUrl = 'http://example.com';
        let customSettings = {};
        let emailRenderer;
        let basePost;
        let addTrackingToUrlStub;
        let labsEnabled;

        beforeEach(function () {
            renderedPost = '<p>Lexical Test</p><img class="is-light-background" src="test-dark" /><img class="is-dark-background" src="test-light" />';
            labsEnabled = true; // TODO: odd default because it means we're testing the unused email-customization template
            basePost = {
                lexical: '{}',
                visibility: 'public',
                title: 'Test Post',
                plaintext: 'Test plaintext for post',
                custom_excerpt: null,
                authors: [
                    createModel({
                        name: 'Test Author'
                    })
                ],
                posts_meta: createModel({
                    feature_image_alt: null,
                    feature_image_caption: null
                }),
                loaded: ['posts_meta']
            };
            postUrl = 'http://example.com';
            customSettings = {};
            addTrackingToUrlStub = sinon.stub();
            addTrackingToUrlStub.callsFake((u, _post, uuid) => {
                return new URL('http://tracked-link.com/?m=' + encodeURIComponent(uuid) + '&url=' + encodeURIComponent(u.href));
            });
            emailRenderer = new EmailRenderer({
                audienceFeedbackService: {
                    buildLink: (_uuid, _postId, score, key) => {
                        return new URL('http://feedback-link.com/?score=' + encodeURIComponent(score) + '&uuid=' + encodeURIComponent(_uuid) + '&key=' + encodeURIComponent(key));
                    }
                },
                urlUtils: {
                    urlFor: (type) => {
                        if (type === 'image') {
                            return 'http://icon.example.com';
                        }
                        return 'http://example.com/subdirectory';
                    },
                    isSiteUrl: (u) => {
                        return u.hostname === 'example.com';
                    }
                },
                settingsCache: {
                    get: (key) => {
                        if (customSettings[key]) {
                            return customSettings[key];
                        }
                        if (key === 'accent_color') {
                            return '#ffffff';
                        }
                        if (key === 'timezone') {
                            return 'Etc/UTC';
                        }
                        if (key === 'title') {
                            return 'Test Blog';
                        }
                        if (key === 'icon') {
                            return 'ICON';
                        }
                    }
                },
                getPostUrl: () => {
                    return postUrl;
                },
                renderers: {
                    lexical: {
                        render: () => {
                            return renderedPost;
                        }
                    },
                    mobiledoc: {
                        render: () => {
                            return '<p> Mobiledoc Test</p>';
                        }
                    }
                },
                linkReplacer,
                memberAttributionService: {
                    addPostAttributionTracking: (u) => {
                        u.searchParams.append('post_tracking', 'added');
                        return u;
                    }
                },
                linkTracking: {
                    service: {
                        addTrackingToUrl: addTrackingToUrlStub
                    }
                },
                outboundLinkTagger: {
                    addToUrl: (u, newsletter) => {
                        u.searchParams.append('source_tracking', newsletter?.get('name') ?? 'site');
                        return u;
                    }
                },
                labs: {
                    isSet: (key) => {
                        if (typeof labsEnabled === 'object') {
                            return labsEnabled[key] || false;
                        }

                        return labsEnabled;
                    }
                },
                t: t
            });
        });

        it('Renders with labs disabled', async function () {
            labsEnabled = false;
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );
        });

        it('returns feedback buttons and unsubscribe links', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            const $ = cheerio.load(response.html);

            response.plaintext.should.containEql('Test Post');

            // Unsubscribe button included
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.html.should.containEql('Unsubscribe');
            response.replacements.length.should.eql(4);
            response.replacements.should.match([
                {
                    id: 'uuid'
                },
                {
                    id: 'key'
                },
                {
                    id: 'unsubscribe_url'
                },
                {
                    id: 'list_unsubscribe'
                }
            ]);

            response.plaintext.should.containEql('http://example.com');
            should($('.preheader').text()).eql('Test plaintext for post');
            response.html.should.containEql('Test Post');
            response.html.should.containEql('http://example.com');

            // Does not include Ghost badge
            response.html.should.not.containEql('https://ghost.org/');

            // Test feedback buttons included
            response.html.should.containEql('http://feedback-link.com/?score=1');
            response.html.should.containEql('http://feedback-link.com/?score=0');
        });

        it('uses custom excerpt as preheader', async function () {
            const post = createModel({...basePost, custom_excerpt: 'Custom excerpt'});
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            const $ = cheerio.load(response.html);
            should($('.preheader').text()).eql('Custom excerpt');
        });

        it('does not include members-only content in preheader for non-members', async function () {
            renderedPost = '<div> Lexical Test </div> some text for both <!--members-only--> finishing part only for members';
            let post = {
                related: sinon.stub(),
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'paid';
                    }

                    if (key === 'plaintext') {
                        return 'foobarbaz';
                    }
                },
                getLazyRelation: sinon.stub()
            };
            let newsletter = {
                get: sinon.stub()
            };

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:free',
                {}
            );

            const $ = cheerio.load(response.html);
            should($('.preheader').text()).eql('Lexical Test some text for both');
        });

        it('does not include paid segmented content in preheader for non-paying members', async function () {
            renderedPost = '<div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> some text for both';
            let post = {
                related: sinon.stub(),
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'public';
                    }

                    if (key === 'plaintext') {
                        return 'foobarbaz';
                    }
                },
                getLazyRelation: sinon.stub()
            };
            let newsletter = {
                get: sinon.stub()
            };

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:free',
                {}
            );

            const $ = cheerio.load(response.html);
            should($('.preheader').text()).eql('Lexical Test some text for both');
        });

        it('only includes first author if more than 2', async function () {
            const post = createModel({...basePost, authors: [
                createModel({
                    name: 'A'
                }),
                createModel({
                    name: 'B'
                }),
                createModel({
                    name: 'C'
                })
            ]});
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );
            assert.match(response.html, /By A &amp; 2 others/);
            assert.match(response.plaintext, /By A & 2 others/);
        });

        it('includes header icon, title, name', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,

                show_header_icon: true,
                show_header_title: true,
                show_header_name: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            response.html.should.containEql('http://icon.example.com');
            assert.match(response.html, /class="site-title"[^>]*?>Test Blog/);
            assert.match(response.html, /class="site-subtitle"[^>]*?>Test Newsletter/);
        });

        it('includes header icon and name', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,

                show_header_icon: true,
                show_header_title: false,
                show_header_name: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            response.html.should.containEql('http://icon.example.com');
            assert.match(response.html, /class="site-title"[^>]*?>Test Newsletter/);
        });

        it('includes Ghost badge if enabled', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: false
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Does include include Ghost badge
            assert.match(response.html, /https:\/\/ghost.org\//);

            // Test feedback buttons not included
            response.html.should.not.containEql('http://feedback-link.com/?score=1');
            response.html.should.not.containEql('http://feedback-link.com/?score=0');
        });

        it('includes newsletter footer as raw html', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: false,
                footer_content: '<p>Test footer</p>'
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Test footer
            response.html.should.containEql('Test footer</p>'); // begin tag skipped because style is inlined in that tag
            response.plaintext.should.containEql('Test footer');
        });

        it('works in dark mode', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true,
                background_color: '#000000'
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            assert.doesNotMatch(response.html, /is-light-background/);
        });

        it('works in light mode', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true,
                background_color: '#FFFFFF'
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            assert.doesNotMatch(response.html, /is-dark-background/);
        });

        it('replaces all links except the unsubscribe, feedback and powered by Ghost links', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {
                clickTrackingEnabled: true
            };

            renderedPost = '<p>Lexical Test</p><p><a href="https://external-domain.com/?ref=123">Hello</a><a href="https://encoded-link.com?code&#x3D;test">Hello</a><a href="https://example.com/?ref=123"><img src="example" /></a><a href="#">Ignore me</a></p>';

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Check all links have domain tracked-link.com
            const $ = cheerio.load(response.html);
            const links = [];
            for (const link of $('a').toArray()) {
                const href = $(link).attr('href');
                links.push(href);

                if (href === '#') {
                    continue;
                }
                if (href.includes('unsubscribe_url')) {
                    href.should.eql('%%{unsubscribe_url}%%');
                } else if (href.includes('feedback-link.com')) {
                    href.should.containEql('%%{uuid}%%');
                } else if (href.includes('https://ghost.org/?via=pbg-newsletter')) {
                    href.should.not.containEql('tracked-link.com');
                } else {
                    href.should.containEql('tracked-link.com');
                    href.should.containEql('m=%%{uuid}%%');
                }
            }

            // Update the following array when you make changes to the email template, check if replacements are correct for each newly added link.
            assert.deepEqual(links, [
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexternal-domain.com%2F%3Fref%3D123%26source_tracking%3Dsite`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fencoded-link.com%2F%3Fcode%3Dtest%26source_tracking%3Dsite`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexample.com%2F%3Fref%3D123%26source_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                '#',
                `http://feedback-link.com/?score=1&uuid=%%{uuid}%%&key=%%{key}%%`,
                `http://feedback-link.com/?score=0&uuid=%%{uuid}%%&key=%%{key}%%`,
                `%%{unsubscribe_url}%%`,
                `https://ghost.org/?via=pbg-newsletter&source_tracking=site`
            ]);

            // Check uuid in replacements
            response.replacements.length.should.eql(4);
            response.replacements[0].id.should.eql('uuid');
            response.replacements[0].token.should.eql(/%%\{uuid\}%%/g);
            response.replacements[1].id.should.eql('key');
            response.replacements[1].token.should.eql(/%%\{key\}%%/g);
            response.replacements[2].id.should.eql('unsubscribe_url');
            response.replacements[2].token.should.eql(/%%\{unsubscribe_url\}%%/g);
            response.replacements[3].id.should.eql('list_unsubscribe');
        });

        it('replaces all relative links if click tracking is disabled', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {
                clickTrackingEnabled: false
            };

            renderedPost = '<p>Lexical Test</p><p><a href="#relative-test">Hello</a><a href="#">Ignore me</a></p>';

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Check all links have domain tracked-link.com
            const $ = cheerio.load(response.html);
            const links = [];
            for (const link of $('a').toArray()) {
                const href = $(link).attr('href');
                links.push(href);
            }

            // Update the following array when you make changes to the email template, check if replacements are correct for each newly added link.
            assert.deepEqual(links, [
                'http://example.com/',
                'http://example.com/',
                'http://example.com/',
                'http://example.com/#relative-test',
                '#',
                'http://feedback-link.com/?score=1&uuid=%%{uuid}%%&key=%%{key}%%',
                'http://feedback-link.com/?score=0&uuid=%%{uuid}%%&key=%%{key}%%',
                '%%{unsubscribe_url}%%',
                'https://ghost.org/?via=pbg-newsletter'
            ]);
        });

        it('handles encoded links', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: true,
                show_post_title_section: true
            });
            const segment = null;
            const options = {
                clickTrackingEnabled: true
            };

            renderedPost = '<p>Lexical Test</p><p><a href="https://external-domain.com/?ref=123">Hello</a><a href="https://example.com/?ref=123"><img src="example" /></a></p>';

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Check all links have domain tracked-link.com
            const $ = cheerio.load(response.html);
            const links = [];
            for (const link of $('a').toArray()) {
                const href = $(link).attr('href');
                links.push(href);
                if (href.includes('unsubscribe_url')) {
                    href.should.eql('%%{unsubscribe_url}%%');
                } else if (href.includes('feedback-link.com')) {
                    href.should.containEql('%%{uuid}%%');
                } else if (href.includes('https://ghost.org/?via=pbg-newsletter')) {
                    href.should.not.containEql('tracked-link.com');
                } else {
                    href.should.containEql('tracked-link.com');
                    href.should.containEql('m=%%{uuid}%%');
                }
            }

            // Update the following array when you make changes to the email template, check if replacements are correct for each newly added link.
            assert.deepEqual(links, [
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexternal-domain.com%2F%3Fref%3D123%26source_tracking%3Dsite`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexample.com%2F%3Fref%3D123%26source_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://feedback-link.com/?score=1&uuid=%%{uuid}%%&key=%%{key}%%`,
                `http://feedback-link.com/?score=0&uuid=%%{uuid}%%&key=%%{key}%%`,
                `%%{unsubscribe_url}%%`,
                `https://ghost.org/?via=pbg-newsletter&source_tracking=site`
            ]);

            // Check uuid in replacements
            response.replacements.length.should.eql(4);
            response.replacements[0].id.should.eql('uuid');
            response.replacements[0].token.should.eql(/%%\{uuid\}%%/g);
            response.replacements[1].id.should.eql('key');
            response.replacements[1].token.should.eql(/%%\{key\}%%/g);
            response.replacements[2].id.should.eql('unsubscribe_url');
            response.replacements[2].token.should.eql(/%%\{unsubscribe_url\}%%/g);
            response.replacements[3].id.should.eql('list_unsubscribe');
        });

        it('removes data-gh-segment and renders paywall', async function () {
            renderedPost = '<div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> some text for both <!--members-only--> finishing part only for members';
            let post = {
                related: () => {
                    return null;
                },
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'paid';
                    }

                    if (key === 'title') {
                        return 'Test Post';
                    }
                },
                getLazyRelation: () => {
                    return {
                        models: [{
                            get: (key) => {
                                if (key === 'name') {
                                    return 'Test Author';
                                }
                            }
                        }]
                    };
                }
            };
            let newsletter = {
                get: (key) => {
                    if (key === 'header_image') {
                        return null;
                    }

                    if (key === 'name') {
                        return 'Test Newsletter';
                    }

                    if (key === 'badge') {
                        return false;
                    }

                    if (key === 'feedback_enabled') {
                        return true;
                    }

                    if (key === 'show_post_title_section') {
                        return true;
                    }

                    return false;
                }
            };
            let options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:free',
                options
            );

            response.plaintext.should.containEql('Test Post');
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.plaintext.should.containEql('http://example.com');

            // Check contains the post name twice
            assert.equal(response.html.match(/Test Post/g).length, 3, 'Should contain the post name 3 times: in the title element, the preheader and in the post title section');

            response.html.should.containEql('Unsubscribe');
            response.html.should.containEql('http://example.com');
            response.replacements.length.should.eql(4);
            response.replacements.should.match([
                {
                    id: 'uuid'
                },
                {
                    id: 'key'
                },
                {
                    id: 'unsubscribe_url'
                },
                {
                    id: 'list_unsubscribe'
                }
            ]);
            response.html.should.not.containEql('members only section');
            response.html.should.containEql('some text for both');
            response.html.should.not.containEql('finishing part only for members');
            response.html.should.containEql('Become a paid member of Test Blog to get access to all');

            let responsePaid = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:-free',
                options
            );
            responsePaid.html.should.containEql('members only section');
            responsePaid.html.should.containEql('some text for both');
            responsePaid.html.should.containEql('finishing part only for members');
            responsePaid.html.should.not.containEql('Become a paid member of Test Blog to get access to all');
        });

        it('should output valid HTML and escape HTML characters in mobiledoc', async function () {
            const post = createModel({
                ...basePost,
                title: 'This is\' a blog po"st test <3</body>',
                excerpt: 'This is a blog post test <3</body>',
                authors: [
                    createModel({
                        name: 'This is a blog post test <3</body>'
                    })
                ],
                posts_meta: createModel({
                    feature_image_alt: 'This is a blog post test <3</body>',
                    feature_image_caption: 'This is escaped in the frontend'
                })
            });
            postUrl = 'https://testpost.com/t&es<3t-post"</body>/';
            customSettings = {
                icon: 'icon2<3</body>'
            };

            const newsletter = createModel({
                feedback_enabled: true,
                name: 'My newsletter <3</body>',
                header_image: 'https://testpost.com/test-post</body>/',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            });
            const segment = null;
            const options = {};

            const response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            await validateHtml(response.html);

            // Check footer content is not escaped
            assert.equal(response.html.includes('<span>Footer content with valid HTML</span>'), true, 'Should include footer content without escaping');

            // Check doesn't contain the non escaped string '<3'
            assert.equal(response.html.includes('<3'), false, 'Should escape HTML characters');
        });

        it('does not replace img height and width with auto from css', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                feedback_enabled: true,
                name: 'My newsletter <3</body>',
                header_image: 'https://testpost.com/test-post</body>/',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            });
            const segment = null;
            const options = {};

            renderedPost = '<p>This is the post.</p><figure class="kg-card kg-image-card"><img src="__GHOST_URL__/content/images/2023/07/audio-sample_thumb.png" class="kg-image" alt loading="lazy" width="248" height="248"></figure><p>Theres an image!</p>';

            const response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // console.log(response.html);

            assert.equal(response.html.includes('width="248" height="248"'), true, 'Should not replace img height and width with auto from css');
            assert.equal(response.html.includes('width="auto" height="auto"'), false, 'Should not replace img height and width with auto from css');
        });

        describe('show excerpt', function () {
            it('is rendered when enabled and customExcerpt is present', async function () {
                const post = createModel(Object.assign({}, basePost, {custom_excerpt: 'This is an excerpt'}));
                const newsletter = createModel({
                    show_post_title_section: true,
                    show_excerpt: true
                });
                const segment = null;
                const options = {};

                const response = await emailRenderer.renderBody(
                    post,
                    newsletter,
                    segment,
                    options
                );

                await validateHtml(response.html);

                assert.equal(response.html.match(/This is an excerpt/g).length, 2, 'Excerpt should appear twice (preheader and excerpt section)');
            });

            it('is not rendered when disabled and customExcerpt is present', async function () {
                const post = createModel(Object.assign({}, basePost, {custom_excerpt: 'This is an excerpt'}));
                const newsletter = createModel({
                    show_post_title_section: true,
                    show_excerpt: false
                });
                const segment = null;
                const options = {};

                const response = await emailRenderer.renderBody(
                    post,
                    newsletter,
                    segment,
                    options
                );

                await validateHtml(response.html);

                assert.equal(response.html.match(/This is an excerpt/g).length, 1, 'Subtitle should only appear once (preheader, excerpt section skipped)');
                response.html.should.not.containEql('post-excerpt-wrapper');
            });

            it('does not render when enabled and customExcerpt is not present', async function () {
                const post = createModel(Object.assign({}, basePost, {custom_excerpt: null}));
                const newsletter = createModel({
                    show_post_title_section: true,
                    show_excerpt: true
                });
                const segment = null;
                const options = {};

                const response = await emailRenderer.renderBody(
                    post,
                    newsletter,
                    segment,
                    options
                );

                await validateHtml(response.html);

                response.html.should.not.containEql('post-excerpt-wrapper');
            });
        });
    });

    describe('getTemplateData', function () {
        let settings = {};
        let labsEnabled = true;
        let emailRenderer;

        beforeEach(function () {
            settings = {
                timezone: 'Etc/UTC'
            };
            labsEnabled = true;
            emailRenderer = new EmailRenderer({
                audienceFeedbackService: {
                    buildLink: (_uuid, _postId, score) => {
                        return new URL('http://feedback-link.com/?score=' + encodeURIComponent(score) + '&uuid=' + encodeURIComponent(_uuid));
                    }
                },
                urlUtils: {
                    urlFor: (type) => {
                        if (type === 'image') {
                            return 'http://icon.example.com';
                        }
                        return 'http://example.com/subdirectory';
                    },
                    isSiteUrl: (u) => {
                        return u.hostname === 'example.com';
                    }
                },
                settingsCache: {
                    get: (key) => {
                        return settings[key];
                    }
                },
                getPostUrl: () => {
                    return 'http://example.com';
                },
                labs: {
                    isSet: () => labsEnabled
                },
                models: {
                    Post: createModelClass({
                        findAll: [
                            {
                                title: 'Test Post 1',
                                published_at: new Date('2018-01-01T00:00:00.000Z'),
                                custom_excerpt: 'Super long custom excerpt. Super long custom excerpt. Super long custom excerpt. Super long custom excerpt. Super long custom excerpt.',
                                feature_image: 'http://example.com/image.jpg'
                            },
                            {
                                title: 'Test Post 2',
                                published_at: new Date('2018-01-01T00:00:00.000Z'),
                                feature_image: null,
                                plaintext: ''
                            },
                            {
                                title: 'Test Post 3',
                                published_at: null, // required for full test coverage
                                feature_image: null,
                                plaintext: 'Nothing special.'
                            }
                        ]
                    })
                },
                t: t
            });
        });

        async function templateDataWithSettings(settingsObj) {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta']
            });
            const newsletter = createModel({
                ...settingsObj
            });

            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            return data;
        }

        it('Uses the correct background colors based on settings', async function () {
            const tests = [
                {input: 'Invalid Color', expected: '#ffffff'},
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'dark', expected: '#15212a'},
                {input: 'light', expected: '#ffffff'},
                {input: null, expected: '#ffffff'}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    background_color: test.input
                });
                assert.equal(data.backgroundColor, test.expected);
            }
        });

        it('Uses the correct border colors based on settings', async function () {
            settings.accent_color = '#ABC123';
            const tests = [
                {input: 'Invalid Color', expected: null},
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'auto', expected: '#FFFFFF', background_color: '#15212A'},
                {input: 'auto', expected: '#000000', background_color: '#ffffff'},
                {input: 'light', expected: null},
                {input: 'accent', expected: settings.accent_color},
                {input: 'transparent', expected: null}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    border_color: test.input,
                    background_color: test.background_color
                });
                assert.equal(data.borderColor, test.expected);
            }
        });

        it('Uses the correct title colors based on settings and background color', async function () {
            settings.accent_color = '#DEF456';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color},
                {input: 'Invalid Color', expected: '#FFFFFF', background_color: '#15212A'},
                {input: null, expected: '#000000', background_color: '#ffffff'}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    title_color: test.input,
                    background_color: test.background_color
                });
                assert.equal(data.titleColor, test.expected);
            }
        });

        it('Sets the backgroundIsDark correctly', async function () {
            const tests = [
                {background_color: '#15212A', expected: true},
                {background_color: '#ffffff', expected: false}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    background_color: test.background_color
                });
                assert.equal(data.backgroundIsDark, test.expected);
            }
        });

        it('Sets the linkColor correctly', async function () {
            settings.accent_color = '#A1B2C3';
            const tests = [
                {background_color: '#15212A', expected: '#ffffff'},
                {background_color: '#ffffff', expected: settings.accent_color}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    background_color: test.background_color
                });
                assert.equal(data.linkColor, test.expected);
            }
        });

        it('uses default accent color', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta']
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.accentColor, '#15212A');
        });

        it('handles invalid accent color', async function () {
            const html = '';
            settings.accent_color = '#QR';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta']
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.accentColor, '#15212A');
        });

        it('uses post published_at', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.post.publishedAt, '1 Jan 1970');
        });

        it('show feature image if post has feature image', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0),
                feature_image: 'http://example.com/image.jpg'
            });
            const newsletter = createModel({
                show_feature_image: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.showFeatureImage, true);
        });

        it('uses newsletter font styles', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif'
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.deepEqual(data.classes, {
                title: 'post-title post-title-no-excerpt post-title-serif post-title-left',
                titleLink: 'post-title-link post-title-link-left',
                meta: 'post-meta post-meta-left',
                excerpt: 'post-excerpt post-excerpt-no-feature-image post-excerpt-serif-sans post-excerpt-left',
                body: 'post-content-sans-serif'
            });
        });

        it('has correct excerpt classes for serif title+body', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'serif',
                show_excerpt: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.classes.excerpt, 'post-excerpt post-excerpt-no-feature-image post-excerpt-serif-serif post-excerpt-left');
        });

        it('show comment CTA is enabled if labs disabled', async function () {
            labsEnabled = false;
            settings.comments_enabled = 'all';
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_comment_cta: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showCommentCta, true);
        });

        it('show comment CTA is disabled if comments disabled', async function () {
            labsEnabled = true;
            settings.comments_enabled = 'off';
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_comment_cta: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showCommentCta, false);
        });

        it('show comment CTA is disabled if disabled', async function () {
            labsEnabled = true;
            settings.comments_enabled = 'all';
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_comment_cta: false
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showCommentCta, false);
        });

        it('show comment CTA is enabled if all enabled', async function () {
            labsEnabled = true;
            settings.comments_enabled = 'all';
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_comment_cta: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showCommentCta, true);
        });

        it('showSubscriptionDetails works is enabled', async function () {
            labsEnabled = true;
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_subscription_details: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showSubscriptionDetails, true);
        });

        it('showSubscriptionDetails can be disabled', async function () {
            labsEnabled = true;
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_subscription_details: false
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.newsletter.showSubscriptionDetails, false);
        });

        it('latestPosts can be disabled', async function () {
            labsEnabled = true;
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_latest_posts: false
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.deepEqual(data.latestPosts, []);
        });

        it('latestPosts can be enabled', async function () {
            labsEnabled = true;
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif',
                show_latest_posts: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.deepEqual(data.latestPosts,
                [
                    {
                        excerpt: 'Super long custom excerpt. Super long custom excerpt. Super long custom excerpt. Super lo<span class="desktop-only">ng custom excerpt. Super long </span>…',
                        title: 'Test Post 1',
                        url: 'http://example.com',
                        featureImage: {
                            src: 'http://example.com/image.jpg',
                            width: 0,
                            height: null
                        },
                        featureImageMobile: {
                            src: 'http://example.com/image.jpg',
                            width: 0,
                            height: null
                        }
                    },
                    {
                        featureImage: null,
                        featureImageMobile: null,
                        excerpt: '',
                        title: 'Test Post 2',
                        url: 'http://example.com'
                    },
                    {
                        featureImage: null,
                        featureImageMobile: null,
                        excerpt: 'Nothing special.',
                        title: 'Test Post 3',
                        url: 'http://example.com'
                    }
                ]);
        });
    });

    describe('createUnsubscribeUrl', function () {
        let emailRenderer;

        beforeEach(function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor() {
                        return 'http://example.com/subdirectory';
                    }
                },
                settingsHelpers: {
                    getMembersValidationKey,
                    createUnsubscribeUrl
                }
            });
        });

        it('includes member uuid and newsletter id', async function () {
            const response = await emailRenderer.createUnsubscribeUrl('memberuuid', {
                newsletterUuid: 'newsletteruuid'
            });
            const unsubscribeUrl = createUnsubscribeUrl('memberuuid', {
                newsletterUuid: 'newsletteruuid'
            });
            assert.equal(response, unsubscribeUrl);
        });

        it('includes comments', async function () {
            const response = await emailRenderer.createUnsubscribeUrl('memberuuid', {
                comments: true
            });
            const unsubscribeUrl = createUnsubscribeUrl('memberuuid', {
                comments: true
            });
            assert.equal(response, unsubscribeUrl);
        });

        it('works for previews', async function () {
            const response = await emailRenderer.createUnsubscribeUrl();
            const unsubscribeUrl = createUnsubscribeUrl();
            assert.equal(response, unsubscribeUrl);
        });
    });

    describe('truncateText', function () {
        it('works for null', async function () {
            const emailRenderer = new EmailRenderer({});
            assert.equal(emailRenderer.truncateText(null, 100), '');
        });
    });

    describe('truncateHTML', function () {
        it('works correctly', async function () {
            const emailRenderer = new EmailRenderer({});
            assert.equal(emailRenderer.truncateHtml('This is a short one', 10, 5), 'This<span class="desktop-only"> is a</span>…');
            assert.equal(emailRenderer.truncateHtml('This is a', 10, 5), 'This<span class="desktop-only"> is a</span><span class="hide-desktop">…</span>');
            assert.equal(emailRenderer.truncateHtml('This', 10, 5), 'This');
            assert.equal(emailRenderer.truncateHtml('This is a long text', 5, 5), 'This…');
            assert.equal(emailRenderer.truncateHtml('This is a long text', 5), 'This…');
            assert.equal(emailRenderer.truncateHtml(null, 10, 5), '');
        });
    });

    describe('limitImageWidth', function () {
        it('Limits width of local images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            assert.equal(response.href, 'http://your-blog.com/content/images/size/w1200/2017/01/02/example.png');
        });

        it('Limits width and height of local images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png', 600, 600);
            assert.equal(response.width, 600);
            assert.equal(response.height, 600);
            assert.equal(response.href, 'http://your-blog.com/content/images/size/w1200h1200/2017/01/02/example.png');
        });

        it('Ignores and logs errors', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        throw new Error('Oops, this is a test.');
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 0);
            assert.equal(response.href, 'http://your-blog.com/content/images/2017/01/02/example.png');
            sinon.assert.calledOnce(logStub);
        });

        it('Limits width of unsplash images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
            assert.equal(response.width, 600);
            assert.equal(response.height, null);
            assert.equal(response.href, 'https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=1200');
        });

        it('Limits width and height of unsplash images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000', 600, 600);
            assert.equal(response.width, 600);
            assert.equal(response.height, 600);
            assert.equal(response.href, 'https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=1200&h=1200');
        });

        it('Does not increase width of images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 300
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 300);
            assert.equal(response.href, 'https://example.com/image.png');
        });
    });
});
