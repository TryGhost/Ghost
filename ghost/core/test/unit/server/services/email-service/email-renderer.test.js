const EmailRenderer = require('../../../../../core/server/services/email-service/email-renderer');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const cheerio = require('cheerio');
const {createModel, createModelClass} = require('./utils');
const linkReplacer = require('../../../../../core/server/services/lib/link-replacer');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {HtmlValidate} = require('html-validate');
const crypto = require('crypto');
const CachedImageSizeFromUrl = require('../../../../../core/server/lib/image/cached-image-size-from-url');
const InMemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');

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
const i18n = i18nLib('en', 'ghost');
const t = (key, options) => {
    return i18n.t(key, options);
};

const i18nFr = i18nLib('fr', 'ghost');
const tFr = (key, options) => {
    return i18nFr.t(key, options);
};

describe('Email renderer', function () {
    beforeEach(function () {
        sinon.stub(logging, 'error');
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

        it('returns uniqueid replacement', function () {
            const html = 'Hello %%{uniqueid}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2);
            assert.equal(replacements[0].token.toString(), '/%%\\{uniqueid\\}%%/g');
            assert.equal(replacements[0].id, 'uniqueid');

            // Should return a valid UUID
            const uniqueId = replacements[0].getValue(member);
            assert.ok(uniqueId);
            assert.equal(typeof uniqueId, 'string');
            // UUID v4 format check (8-4-4-4-12 hexadecimal characters)
            assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uniqueId));
        });

        it('returns different uniqueid values for different calls', function () {
            const html = 'Hello %%{uniqueid}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});

            const uniqueId1 = replacements[0].getValue(member);
            const uniqueId2 = replacements[0].getValue(member);

            // Each call should return a different UUID
            assert.notEqual(uniqueId1, uniqueId2);
        });

        it('handles multiple uniqueid instances in same email', function () {
            const html = 'Hello %%{uniqueid}%% and %%{uniqueid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});
            assert.equal(replacements.length, 2); // uniqueid + list_unsubscribe
            assert.equal(replacements[0].token.toString(), '/%%\\{uniqueid\\}%%/g');
            assert.equal(replacements[0].id, 'uniqueid');

            // Should still be recognized as a single replacement definition
            const uniqueIdReplacements = replacements.filter(r => r.id === 'uniqueid');
            assert.equal(uniqueIdReplacements.length, 1);
        });

        it('does not call uniqueid getValue when not used in email content', function () {
            // Spy on crypto.randomUUID to verify it's not called
            const randomUUIDSpy = sinon.spy(crypto, 'randomUUID');

            const html = 'Hello %%{first_name}%%, welcome to our newsletter!';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});

            // Should only have first_name and list_unsubscribe replacements
            assert.equal(replacements.length, 2);

            // Verify uniqueid is not included in replacements
            const uniqueIdReplacements = replacements.filter(r => r.id === 'uniqueid');
            assert.equal(uniqueIdReplacements.length, 0);

            // Call getValue on all replacements to simulate actual usage
            replacements.forEach((replacement) => {
                replacement.getValue(member);
            });

            // Verify crypto.randomUUID was never called since uniqueid wasn't used
            sinon.assert.notCalled(randomUUIDSpy);

            randomUUIDSpy.restore();
        });
    });

    describe('buildReplacementDefinitions with locales', function () {
        let emailRenderer;
        let newsletter;
        let member;

        beforeEach(function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => true
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

        it('handles dates when the locale is fr and labs enabled', function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => true
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
                    isSet: () => true
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

        it('handles dates when the locale has whitespace like "en "', function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => true
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                        if (key === 'locale') {
                            return 'en ';
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

        it('handles dates when the locale is invalid like "(en)"', function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory/'
                },
                labs: {
                    isSet: () => true
                },
                settingsCache: {
                    get: (key) => {
                        if (key === 'timezone') {
                            return 'UTC';
                        }
                        if (key === 'locale') {
                            return '(en)';
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
            assert.equal(response, 'Test Newsletter');
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
            assert.equal(response, 'Sample Post');
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
            assert.equal(response, '[TEST] Sample Post');
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
            assert.equal(response, '"Ghost" <ghost@example.com>');
        });

        it('defaults to site title and domain', function () {
            const newsletter = createModel({
                sender_email: '',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            assert.equal(response, '"Test Blog" <reply@example.com>');
        });

        it('changes localhost domain to proper domain in development', function () {
            const newsletter = createModel({
                sender_email: 'example@localhost',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            assert.equal(response, '"Test Blog" <localhost@example.com>');
        });

        it('ignores empty sender names', function () {
            siteTitle = '';
            const newsletter = createModel({
                sender_email: 'example@example.com',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            assert.equal(response, 'example@example.com');
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
            assert.equal(response, 'support@example.com');
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

        it('passes useFallbackAddress parameter to getAddress', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'newsletter'
            });
            let capturedOptions;
            emailAddressService.getAddress = (addresses, options) => {
                capturedOptions = options;
                return {
                    from: addresses.from,
                    replyTo: {address: 'fallback@fallback.example.com'}
                };
            };
            const response = emailRenderer.getReplyToAddress({}, newsletter, true);
            assert.equal(capturedOptions.useFallbackAddress, true);
            assert.equal(response, 'fallback@fallback.example.com');
        });

        it('defaults useFallbackAddress to false when not provided', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'custom@example.com'
            });
            let capturedOptions;
            emailAddressService.getAddress = (addresses, options) => {
                capturedOptions = options;
                return {
                    from: addresses.from,
                    replyTo: addresses.replyTo
                };
            };
            emailRenderer.getReplyToAddress({}, newsletter);
            assert.equal(capturedOptions.useFallbackAddress, false);
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
            assert.deepEqual(response, [null]);

            post = {
                get: (key) => {
                    if (key === 'mobiledoc') {
                        return '{}';
                    }
                }
            };
            response = await emailRenderer.getSegments(post);
            assert.deepEqual(response, [null]);
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
            assert.deepEqual(response, ['status:free', 'status:-free']);
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
            assert.deepEqual(response, ['status:free', 'status:-free']);
        });
    });

    describe('renderBody', function () {
        let renderedPost;
        let postUrl = 'http://example.com';
        let customSettings = {};
        let renderersStub;
        let emailRenderer;
        let basePost;
        let baseNewsletter;
        let addTrackingToUrlStub;
        let labsEnabled;

        beforeEach(function () {
            renderedPost = '<p>Lexical Test</p><img class="is-light-background" src="test-dark" /><img class="is-dark-background" src="test-light" />';
            labsEnabled = false;
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
            baseNewsletter = {
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,
                show_post_title_section: true
            };
            postUrl = 'http://example.com';
            customSettings = {};
            addTrackingToUrlStub = sinon.stub();
            addTrackingToUrlStub.callsFake((u, _post, uuid) => {
                return new URL('http://tracked-link.com/?m=' + encodeURIComponent(uuid) + '&url=' + encodeURIComponent(u.href));
            });
            renderersStub = {
                lexical: {
                    render: sinon.stub().callsFake(() => (renderedPost))
                },
                mobiledoc: {
                    render: sinon.stub().returns('<p> Mobiledoc Test</p>')
                }
            };
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
                renderers: renderersStub,
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

        it('Renders', async function () {
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

            assert(response.plaintext.includes('Test Post'));

            // Unsubscribe button included
            assert(response.plaintext.includes('Unsubscribe [%%{unsubscribe_url}%%]'));
            assert(response.html.includes('Unsubscribe'));
            assert.deepEqual(response.replacements.map(r => r.id), [
                'uuid',
                'key',
                'unsubscribe_url',
                'list_unsubscribe'
            ]);

            assert(response.plaintext.includes('http://example.com'));
            assert.equal($('.preheader').text(), 'Test plaintext for post');
            assert(response.html.includes('Test Post'));
            assert(response.html.includes('http://example.com'));

            // Does not include Ghost badge
            assert(!response.html.includes('https://ghost.org/'));

            // Test feedback buttons included
            assert(response.html.includes('http://feedback-link.com/?score=1'));
            assert(response.html.includes('http://feedback-link.com/?score=0'));
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
            assert.equal($('.preheader').text(), 'Custom excerpt');
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
            assert.equal($('.preheader').text(), 'Lexical Test some text for both');
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
            assert.equal($('.preheader').text(), 'Lexical Test some text for both');
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

            assert(response.html.includes('http://icon.example.com'));
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

            assert(response.html.includes('http://icon.example.com'));
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
            assert(!response.html.includes('http://feedback-link.com/?score=1'));
            assert(!response.html.includes('http://feedback-link.com/?score=0'));
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
            assert(response.html.includes('Test footer</p>')); // begin tag skipped because style is inlined in that tag
            assert(response.plaintext.includes('Test footer'));
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
                    assert.equal(href, '%%{unsubscribe_url}%%');
                } else if (href.includes('feedback-link.com')) {
                    assert(href.includes('%%{uuid}%%'));
                } else if (href.includes('https://ghost.org/?via=pbg-newsletter')) {
                    assert(!href.includes('tracked-link.com'));
                } else {
                    assert(href.includes('tracked-link.com'));
                    assert(href.includes('m=%%{uuid}%%'));
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
            assert.equal(response.replacements.length, 4);
            assert.equal(response.replacements[0].id, 'uuid');
            assert.deepEqual(response.replacements[0].token, /%%\{uuid\}%%/g);
            assert.equal(response.replacements[1].id, 'key');
            assert.deepEqual(response.replacements[1].token, /%%\{key\}%%/g);
            assert.equal(response.replacements[2].id, 'unsubscribe_url');
            assert.deepEqual(response.replacements[2].token, /%%\{unsubscribe_url\}%%/g);
            assert.equal(response.replacements[3].id, 'list_unsubscribe');
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
                    assert.equal(href, '%%{unsubscribe_url}%%');
                } else if (href.includes('feedback-link.com')) {
                    assert(href.includes('%%{uuid}%%'));
                } else if (href.includes('https://ghost.org/?via=pbg-newsletter')) {
                    assert(!href.includes('tracked-link.com'));
                } else {
                    assert(href.includes('tracked-link.com'));
                    assert(href.includes('m=%%{uuid}%%'));
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
            assert.equal(response.replacements.length, 4);
            assert.equal(response.replacements[0].id, 'uuid');
            assert.deepEqual(response.replacements[0].token, /%%\{uuid\}%%/g);
            assert.equal(response.replacements[1].id, 'key');
            assert.deepEqual(response.replacements[1].token, /%%\{key\}%%/g);
            assert.equal(response.replacements[2].id, 'unsubscribe_url');
            assert.deepEqual(response.replacements[2].token, /%%\{unsubscribe_url\}%%/g);
            assert.equal(response.replacements[3].id, 'list_unsubscribe');
        });

        it('tracks links containing %%{uuid}%% and preserves placeholder in destination', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: false,
                show_post_title_section: true
            });
            const segment = null;
            const options = {
                clickTrackingEnabled: true
            };

            renderedPost = '<p>Lexical Test</p><p><a href="https://share.transistor.fm/e/episode?subscriber_id=%%{uuid}%%">Listen to episode</a></p>';

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Verify tracking was called for the Transistor link
            sinon.assert.called(addTrackingToUrlStub);
            const transistorCall = addTrackingToUrlStub.getCalls().find(
                call => call.args[0].href.includes('transistor.fm')
            );
            assertExists(transistorCall);

            // The %%{uuid}%% placeholder should survive in the tracked URL destination
            // When URL searchParams are manipulated, the placeholder gets URL-encoded
            const href = transistorCall.args[0].href;
            const hasPlaceholder = href.includes('%%{uuid}%%') ||
                href.includes('%25%25%7Buuid%7D%25%25');
            assert.equal(hasPlaceholder, true, 'URL should contain uuid placeholder');

            // The final tracked link should be in the HTML
            const $ = cheerio.load(response.html);
            const links = [];
            for (const link of $('a').toArray()) {
                const linkHref = $(link).attr('href');
                links.push(linkHref);
            }

            // The Transistor link should be tracked
            const trackedTransistorLink = links.find(linkHref => linkHref.includes('tracked-link.com'));
            assertExists(trackedTransistorLink);
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

            assert(response.plaintext.includes('Test Post'));
            assert(response.plaintext.includes('Unsubscribe [%%{unsubscribe_url}%%]'));
            assert(response.plaintext.includes('http://example.com'));

            // Check contains the post name twice
            assert.equal(response.html.match(/Test Post/g).length, 3, 'Should contain the post name 3 times: in the title element, the preheader and in the post title section');

            assert(response.html.includes('Unsubscribe'));
            assert(response.html.includes('http://example.com'));
            assert.deepEqual(response.replacements.map(r => r.id), [
                'uuid',
                'key',
                'unsubscribe_url',
                'list_unsubscribe'
            ]);
            assert(!response.html.includes('members only section'));
            assert(response.html.includes('some text for both'));
            assert(!response.html.includes('finishing part only for members'));
            assert(response.html.includes('Become a paid member of Test Blog to get access to all'));

            let responsePaid = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:-free',
                options
            );
            assert(responsePaid.html.includes('members only section'));
            assert(responsePaid.html.includes('some text for both'));
            assert(responsePaid.html.includes('finishing part only for members'));
            assert(!responsePaid.html.includes('Become a paid member of Test Blog to get access to all'));
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
                assert(!response.html.includes('post-excerpt-wrapper'));
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

                assert(!response.html.includes('post-excerpt-wrapper'));
            });
        });

        const testLexicalRenderDesignOptions = async function ({expectedObject, labs}) {
            labsEnabled = labs || false;

            const post = createModel(basePost);
            const newsletter = createModel({
                ...baseNewsletter,
                title_font_weight: 'semibold',
                button_corners: 'square',
                button_style: 'outline',
                link_style: 'normal',
                image_corners: 'rounded',
                section_title_color: '#000011',
                post_title_color: '#000022',
                divider_color: 'light', // should return our default hex value
                link_color: '#000033',
                background_color: '#000000',
                header_background_color: '#000044'
            });
            const segment = null;
            const options = {};

            await emailRenderer.renderBody(post, newsletter, segment, options);

            sinon.assert.calledOnce(renderersStub.lexical.render);
            sinon.assert.calledWithMatch(renderersStub.lexical.render,
                post.get('lexical'),
                {
                    target: 'email',
                    postUrl: 'http://example.com',
                    design: expectedObject
                }
            );
        };

        it('passes expected data through to lexical renderer', async function () {
            await testLexicalRenderDesignOptions({
                expectedObject: {
                    accentColor: '#ffffff',
                    accentContrastColor: '#000000',
                    backgroundColor: '#000000',
                    backgroundIsDark: true,
                    headerBackgroundColor: '#000044',
                    buttonCorners: 'square',
                    buttonStyle: 'outline',
                    titleFontWeight: 'semibold',
                    linkStyle: 'normal',
                    imageCorners: 'rounded',
                    postTitleColor: '#000022',
                    sectionTitleColor: '#000011',
                    linkColor: '#000033',
                    dividerColor: '#e0e7eb',
                    buttonColor: '#ffffff',
                    buttonTextColor: '#000000'
                }
            });
        });
    });

    describe('getTemplateData', function () {
        let settings = {};
        let labsEnabled = false;
        let emailRenderer;

        beforeEach(function () {
            settings = {
                timezone: 'Etc/UTC'
            };
            labsEnabled = false;
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

        it('Includes accent and accent contrast colors', async function () {
            settings.accent_color = '#15212A';
            const data = await templateDataWithSettings({});
            assert.equal(data.accentColor, '#15212A');
            assert.equal(data.accentContrastColor, '#FFFFFF');
        });

        it('Includes list of cta background colors', async function () {
            const data = await templateDataWithSettings({});
            assert.deepEqual(data.ctaBgColors, [
                'grey',
                'blue',
                'green',
                'yellow',
                'red',
                'pink',
                'purple'
            ]);
        });

        it('Uses the correct background colors based on settings', async function () {
            const tests = [
                {input: 'Invalid Color', expected: '#ffffff'},
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'dark', expected: '#ffffff'}, // not a valid hex color, first iteration of email customization had light/dark
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

        it('Uses the correct post title colors based on settings and background color', async function () {
            settings.accent_color = '#DEF456';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color},
                {input: 'Invalid Color', expected: '#FFFFFF', background_color: '#15212A'},
                {input: null, expected: '#000000', background_color: '#ffffff'},
                {input: null, expected: '#FFFFFF', background_color: '#ffffff', header_background_color: '#000000'}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    post_title_color: test.input,
                    background_color: test.background_color,
                    header_background_color: test.header_background_color || null
                });
                assert.equal(data.postTitleColor, test.expected);
            }
        });

        it('Uses the correct post title color', async function () {
            settings.accent_color = '#DEF456';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    post_title_color: test.input
                });
                assert.equal(data.postTitleColor, test.expected, `Failed for post_title_color input: ${test.input}`);
            }
        });

        it('Uses the correct section title colors based on settings', async function () {
            settings.accent_color = '#DEF456';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color},
                {input: 'auto', expected: null},
                {input: 'Invalid Color', expected: null},
                {input: null, expected: null}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    section_title_color: test.input
                });
                assert.equal(data.sectionTitleColor, test.expected);
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

        it('Uses the correct link colour best on settings', async function () {
            settings.accent_color = '#A1B2C3';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color},
                {input: 'Invalid Color', expected: settings.accent_color}, // default to accent color
                // null = "auto" based on background color
                {input: null, expected: '#FFFFFF', settings: {background_color: '#000000'}},
                {input: null, expected: '#000000', settings: {background_color: '#FFFFFF'}}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    link_color: test.input,
                    ...(test.settings || {})
                });
                assert.equal(data.linkColor, test.expected);
            }
        });

        it('Uses the correct header background color based on settings', async function () {
            settings.accent_color = '#A1B2C3';
            const tests = [
                {input: '#BADA55', expected: '#BADA55'},
                {input: 'accent', expected: settings.accent_color}
            ];

            for (const test of tests) {
                const data = await templateDataWithSettings({
                    header_background_color: test.input
                });
                assert.equal(data.headerBackgroundColor, test.expected);
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
                container: 'container title-serif',
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

        it('show comment CTA is enabled if comments enabled', async function () {
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

        it('show comment CTA is disabled if disabled in newsletter settings', async function () {
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

        async function testDataProperty(newsletterSettings, property, expectedValue, options = {labsEnabled: false}) {
            labsEnabled = options.labsEnabled ?? false;

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
                show_latest_posts: true,
                ...newsletterSettings
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data[property], expectedValue, property);
        }

        async function testButtonBorderRadius(buttonCorners, expectedRadius) {
            return await testDataProperty({
                button_corners: buttonCorners
            }, 'buttonBorderRadius', expectedRadius);
        }

        async function testImageCorners(imageCorners, expectedBoolean) {
            return await testDataProperty({
                image_corners: imageCorners
            }, 'hasRoundedImageCorners', expectedBoolean);
        }

        it('sets buttonBorderRadius to correct default', async function () {
            await testButtonBorderRadius(null, '6px');
        });

        it('sets buttonBorderRadius to correct rounded value', async function () {
            await testButtonBorderRadius('rounded', '6px');
        });

        it('sets buttonBorderRadius to correct square value', async function () {
            await testButtonBorderRadius('square', '0');
        });

        it('sets buttonBorderRadius to correct pill value', async function () {
            await testButtonBorderRadius('pill', '9999px');
        });

        it('sets imageCorners to correct rounded value', async function () {
            await testImageCorners('rounded', true);
        });

        it('sets imageCorners to correct square value which is false', async function () {
            // null because square has no border radius
            await testImageCorners('square', false);
        });

        async function testHasOutlineButtons(buttonStyle, expectedValue) {
            return await testDataProperty({
                button_style: buttonStyle
            }, 'hasOutlineButtons', expectedValue);
        }

        it('sets hasOutlineButtons to correct default', async function () {
            await testHasOutlineButtons(null, false);
        });

        it('sets hasOutlineButtons to correct fill value', async function () {
            await testHasOutlineButtons('fill', false);
        });

        it('sets hasOutlineButtons to correct outline value', async function () {
            await testHasOutlineButtons('outline', true);
        });

        [
            // setting, expected titleWeight, expected titleStrongWeight
            ['normal', '400', '700'],
            ['medium', '500', '700'],
            ['semibold', '600', '700'],
            ['bold', '700', '800']
        ].forEach(([settingValue, titleWeight, titleStrongWeight]) => {
            it(`font weights for ${settingValue} are ${titleWeight} and ${titleStrongWeight}`, async function () {
                const html = '';
                const post = createModel({
                    posts_meta: createModel({}),
                    loaded: ['posts_meta'],
                    published_at: new Date(0)
                });
                const newsletter = createModel({
                    title_font_weight: settingValue
                });
                const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});

                assert.equal(data.titleWeight, titleWeight);
                assert.equal(data.titleStrongWeight, titleStrongWeight);
            });
        });

        async function testLinkStyle(settingValue, expectedValue, options = {labsEnabled: false}) {
            testDataProperty({
                link_style: settingValue
            }, 'linkStyle', expectedValue, options);
        }

        it('sets linkStyle to correct default', async function () {
            await testLinkStyle(null, 'underline');
        });

        it('passes newsletter link_style through', async function () {
            await testLinkStyle('normal', 'normal');
        });

        async function testDividerColor(settingValue, expectedValue, options = {labsEnabled: false}) {
            testDataProperty({
                divider_color: settingValue
            }, 'dividerColor', expectedValue, options);
        }

        it('sets dividerColor to correct default value', async function () {
            await testDividerColor(null, '#e0e7eb');
        });

        it('sets dividerColor to correct light value', async function () {
            await testDividerColor('light', '#e0e7eb');
        });

        it('sets dividerColor to correct accent value', async function () {
            settings.accent_color = '#aabbcc';
            await testDividerColor('accent', '#aabbcc');
        });

        it('sets dividerColor to correct custom value', async function () {
            await testDividerColor('#BADA55', '#BADA55');
        });

        it('sets dividerColor to default value if invalid value is provided', async function () {
            await testDividerColor('#nothex', '#e0e7eb');
        });

        async function testButtonColor(settingValue, expectedValue, expectedTextValue, otherSettings = {}, options = {labsEnabled: false}) {
            await testDataProperty({
                ...otherSettings,
                button_color: settingValue
            }, 'buttonColor', expectedValue, options);
            await testDataProperty({
                ...otherSettings,
                button_color: settingValue
            }, 'buttonTextColor', expectedTextValue, options);
        }

        [
            // button_color, expectedButtonColor, expectedButtonTextColor, otherSettings
            [null, '#000000', '#FFFFFF', {background_color: '#dddddd'}], // light bg
            [null, '#FFFFFF', '#000000', {background_color: '#222222'}], // dark bg
            ['accent', '#15212A', '#FFFFFF'],
            ['#BADA55', '#BADA55', '#000000'],
            ['#nothex', '#15212A', '#FFFFFF']
        ].forEach(([settingValue, expectedValue, expectedTextValue, otherSettings]) => {
            it(`sets buttonColor/buttonTextColor to correct value for ${settingValue}${otherSettings ? ` with ${JSON.stringify(otherSettings)}` : ''}`, async function () {
                await testButtonColor(settingValue, expectedValue, expectedTextValue, otherSettings);
            });
        });

        async function testHeaderBackgroundColor(settingValue, expectedValue, expectedIsDarkValue, otherSettings = {}, options = {labsEnabled: false}) {
            await testDataProperty({
                ...otherSettings,
                header_background_color: settingValue
            }, 'headerBackgroundColor', expectedValue, options);

            await testDataProperty({
                ...otherSettings,
                header_background_color: settingValue
            }, 'headerBackgroundIsDark', expectedIsDarkValue, options);
        }

        [
            // header_background_color, expected headerBackgroundColor, expected headerBackgroundIsDark, otherSettings
            [null, null, false],
            [null, null, true, {background_color: '#000000'}],
            ['accent', '#15212A', true],
            ['#FFFFFF', '#FFFFFF', false],
            ['#000000', '#000000', true],
            ['nothex', null, false],
            ['nothex', null, true, {background_color: '#000000'}]
        ].forEach(([settingValue, expectedValue, expectedIsDarkValue, otherSettings]) => {
            it(`sets headerBackgroundColor/headerBackgroundIsDark to correct values for ${settingValue}${otherSettings ? ` with ${JSON.stringify(otherSettings)}` : ''}`, async function () {
                await testHeaderBackgroundColor(settingValue, expectedValue, expectedIsDarkValue, otherSettings);
            });
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
            const isLocal = url => url === 'http://your-blog.com/content/images/2017/01/02/example.png';
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage: isLocal,
                    isInternalImage: isLocal
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            assert.equal(response.href, 'http://your-blog.com/content/images/size/w1200/2017/01/02/example.png');
        });

        it('Limits width and height of local images', async function () {
            const isLocal = url => url === 'http://your-blog.com/content/images/2017/01/02/example.png';
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage: isLocal,
                    isInternalImage: isLocal
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png', 600, 600);
            assert.equal(response.width, 600);
            assert.equal(response.height, 600);
            assert.equal(response.href, 'http://your-blog.com/content/images/size/w1200h1200/2017/01/02/example.png');
        });

        it('Limits width of CDN content images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage(url) {
                        return url.startsWith('https://storage.ghost.is/c/6f/a3/test/content/images/');
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://storage.ghost.is/c/6f/a3/test/content/images/2026/02/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            assert.equal(response.href, 'https://storage.ghost.is/c/6f/a3/test/content/images/size/w1200/2026/02/example.png');
        });

        it('Does not rewrite external content/images URLs', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://example.com/content/images/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            assert.equal(response.href, 'https://example.com/content/images/example.png');
        });

        it('Does not double-rewrite already-sized CDN image URLs', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage(url) {
                        return url.startsWith('https://storage.ghost.is/c/6f/a3/test/content/images/');
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://storage.ghost.is/c/6f/a3/test/content/images/size/w600/2026/02/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            assert.equal(response.href, 'https://storage.ghost.is/c/6f/a3/test/content/images/size/w600/2026/02/example.png');
        });

        it('Returns default dimensions when getCachedImageSizeFromUrl returns null', async function () {
            const isLocal = url => url === 'http://your-blog.com/content/images/2017/01/02/example.png';
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return null;
                    }
                },
                storageUtils: {
                    isLocalImage: isLocal,
                    isInternalImage: isLocal
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 0);
            assert.equal(response.height, null);
            assert.equal(response.href, 'http://your-blog.com/content/images/2017/01/02/example.png');
        });

        it('Limits width of unsplash images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
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
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 2000,
                            height: 1000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
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
                    getCachedImageSizeFromUrl() {
                        return {
                            width: 300
                        };
                    }
                },
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 300);
            assert.equal(response.href, 'https://example.com/image.png');
        });

        it('Uses cached image dimensions on cache hit', async function () {
            const underlyingFetch = sinon.stub().callsFake(() => Promise.resolve({width: 2000, height: 1000}));
            const cacheStore = new InMemoryCache();
            // Pre-populate cache
            cacheStore.set('https://example.com/image.png', {url: 'https://example.com/image.png', width: 2000, height: 1000});

            const cachedImageSize = new CachedImageSizeFromUrl({
                getImageSizeFromUrl: underlyingFetch,
                cache: cacheStore
            });

            const emailRenderer = new EmailRenderer({
                imageSize: cachedImageSize,
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            // Underlying fetch should not be called when cache has the data
            sinon.assert.notCalled(underlyingFetch);
        });

        it('Falls back to fetching image dimensions on cache miss and writes back to cache', async function () {
            const underlyingFetch = sinon.stub().callsFake(() => Promise.resolve({width: 2000, height: 1000}));
            const cacheStore = new InMemoryCache();

            const cachedImageSize = new CachedImageSizeFromUrl({
                getImageSizeFromUrl: underlyingFetch,
                cache: cacheStore
            });

            const emailRenderer = new EmailRenderer({
                imageSize: cachedImageSize,
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            // Underlying fetch SHOULD be called on cache miss
            sinon.assert.calledOnce(underlyingFetch);
            // Result should be written back to cache
            const cached = cacheStore.get('https://example.com/image.png');
            assert.ok(cached);
            assert.equal(cached.width, 2000);
            assert.equal(cached.height, 1000);
        });

        it('Falls back to fetching when cache has an error entry (no dimensions)', async function () {
            const underlyingFetch = sinon.stub().callsFake(() => Promise.resolve({width: 2000, height: 1000}));
            const cacheStore = new InMemoryCache();
            // Pre-populate cache with an error entry (no width/height)
            cacheStore.set('https://example.com/image.png', {url: 'https://example.com/image.png'});

            const cachedImageSize = new CachedImageSizeFromUrl({
                getImageSizeFromUrl: underlyingFetch,
                cache: cacheStore
            });

            const emailRenderer = new EmailRenderer({
                imageSize: cachedImageSize,
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 600);
            assert.equal(response.height, 300);
            // Should retry the underlying fetch when cache has an error entry
            sinon.assert.calledOnce(underlyingFetch);
        });

        it('Returns default dimensions when fetch fails', async function () {
            const ghosterrors = require('@tryghost/errors');
            const underlyingFetch = sinon.stub().rejects(new ghosterrors.InternalServerError({
                message: 'Request timed out.',
                code: 'IMAGE_SIZE_URL'
            }));
            const cacheStore = new InMemoryCache();

            const cachedImageSize = new CachedImageSizeFromUrl({
                getImageSizeFromUrl: underlyingFetch,
                cache: cacheStore
            });

            const emailRenderer = new EmailRenderer({
                imageSize: cachedImageSize,
                storageUtils: {
                    isLocalImage() {
                        return false;
                    },
                    isInternalImage() {
                        return false;
                    }
                }
            });

            const response = await emailRenderer.limitImageWidth('https://example.com/broken.png');
            // getCachedImageSizeFromUrl returns null on error, limitImageWidth returns fallback
            assert.equal(response.href, 'https://example.com/broken.png');
            assert.equal(response.width, 0);
            assert.equal(response.height, null);
        });
    });
    describe('additional i18n tests', function () {
        let renderedPost;
        let postUrl = 'http://example.com';
        let customSettings = {};
        let emailRenderer;
        let addTrackingToUrlStub;
        let labsEnabled;

        beforeEach(function () {
            renderedPost = '<p>Lexical Test</p><img class="is-light-background" src="test-dark" /><img class="is-dark-background" src="test-light" />';
            labsEnabled = false;

            postUrl = 'http://example.com';
            customSettings = {
                locale: 'fr',
                site_title: 'Cathy\'s Blog'
            };
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
                        if (key === 'icon') {
                            return 'ICON';
                        }
                        if (key === 'visibility') {
                            return 'paid';
                        }
                        if (key === 'title') {
                            return 'Cathy\'s Blog';
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
                t: tFr
            });
        });
        it('correctly include the site name in the paywall (in French)', async function () {
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

            assert(!response.html.includes('members only section'));
            assert(response.html.includes('some text for both'));
            assert(!response.html.includes('finishing part only for members'));
            assert(response.html.includes('Devenez un(e) abonn&#xE9;(e) payant de Cathy&#39;s Blog pour acc&#xE9;der &#xE0; du contenu exclusif'));
            assert(response.plaintext.includes('Devenez un(e) abonné(e) payant de Cathy\'s Blog pour accéder à du contenu exclusif'));
        });
    });
});
