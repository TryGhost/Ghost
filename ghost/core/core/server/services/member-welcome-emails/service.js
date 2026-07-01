const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const verifyEmailTemplate = require('../newsletters/emails/verify-email');
const MagicLink = require('../lib/magic-link/magic-link');
const sentry = require('../../../shared/sentry');
const emailAddressService = require('../email-address');
const settingsHelpers = require('../settings-helpers');
const EmailAddressParser = require('../email-address/email-address-parser');
const mail = require('../mail');
const labs = require('../../../shared/labs');
const {Automation, EmailDesignSetting, Newsletter} = require('../../models');
const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG, MEMBER_WELCOME_EMAIL_LOG_KEY, MEMBER_WELCOME_EMAIL_TAG, MEMBER_WELCOME_EMAIL_SLUGS, MESSAGES} = require('./constants');

const VERIFIED_SENDER_PROPERTIES = ['sender_reply_to'];
const WELCOME_EMAIL_FILTER = `slug:${MEMBER_WELCOME_EMAIL_SLUGS.free},slug:${MEMBER_WELCOME_EMAIL_SLUGS.paid}`;
const SHARED_SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];
const EMAIL_VALIDATION_TYPE_BY_FIELD = {
    sender_email: 'from',
    sender_reply_to: 'replyTo'
};

/**
 * @param {null | undefined | string} value
 * @returns {string}
 */
const trimValue = value => value?.trim() || '';

const getSenderDetailsFromDesignSettings = (designSettingsJson) => {
    return {
        senderName: designSettingsJson?.sender_name,
        senderEmail: designSettingsJson?.sender_email,
        senderReplyTo: designSettingsJson?.sender_reply_to
    };
};

const getSenderDetails = (designSettingsJson) => {
    const designSenderDetails = getSenderDetailsFromDesignSettings(designSettingsJson);
    return {
        senderName: trimValue(designSenderDetails.senderName),
        senderEmail: trimValue(designSenderDetails.senderEmail),
        senderReplyTo: trimValue(designSenderDetails.senderReplyTo)
    };
};

class MemberWelcomeEmailService {
    #mailer;
    #renderer;
    #magicLinkService;
    #memberWelcomeEmails = {free: null, paid: null};
    #defaultNewsletterSenderOptions = null;

    constructor({t, dir, singleUseTokenProvider}) {
        emailAddressService.init();
        this.#mailer = new mail.GhostMailer();
        this.#renderer = new MemberWelcomeEmailRenderer({t, dir});

        const getSigninURL = (token) => {
            const adminUrl = urlUtils.urlFor('admin', true);
            const signinURL = new URL(adminUrl);
            signinURL.hash = `/settings/memberemails?verifyEmail=${token}`;
            return signinURL.href;
        };

        this.#magicLinkService = new MagicLink({
            transporter: {
                sendMail() {
                    // noop - overridden in `#sendEmailVerificationMagicLink`
                }
            },
            tokenProvider: singleUseTokenProvider,
            getSigninURL,
            getText(url, type, email) {
                return `
                Hey there,

                Please confirm your email address with this link:

                ${url}

                For your security, the link will expire in 24 hours time.

                ---

                Sent to ${email}
                If you did not make this request, you can simply delete this message. This email address will not be used.
                `;
            },
            getHTML(url, type, email) {
                return verifyEmailTemplate({url, email});
            },
            getSubject() {
                return 'Verify email address';
            },
            sentry
        });
    }

    #getSiteSettings() {
        const icon = settingsCache.get('icon');

        return {
            title: settingsCache.get('title') || 'Ghost',
            url: urlUtils.urlFor('home', true),
            accentColor: settingsCache.get('accent_color') || '#15212A',
            iconUrl: icon ? urlUtils.urlFor('image', {
                image: icon
            }, true) : null,
            locale: settingsCache.get('locale') || 'en'
        };
    }

    async #getDefaultNewsletterSenderOptions() {
        const newsletter = await Newsletter.getDefaultNewsletter();
        if (!newsletter) {
            return {};
        }

        let senderName = settingsCache.get('title') || '';
        if (newsletter.get('sender_name')) {
            senderName = newsletter.get('sender_name');
        }

        let fromAddress = settingsHelpers.getNoReplyAddress();
        if (newsletter.get('sender_email')) {
            fromAddress = newsletter.get('sender_email');
        }

        const fromAddresses = emailAddressService.service.getAddress({
            from: {
                address: fromAddress,
                name: senderName || undefined
            }
        });

        const from = EmailAddressParser.stringify(fromAddresses.from);
        const replyToSetting = newsletter.get('sender_reply_to');
        let replyTo = null;

        if (replyToSetting === 'support') {
            replyTo = settingsHelpers.getMembersSupportAddress();
        } else if (replyToSetting === 'newsletter' && !emailAddressService.service.managedEmailEnabled) {
            replyTo = from;
        } else {
            const addresses = emailAddressService.service.getAddress({
                from: {
                    address: fromAddress,
                    name: senderName || undefined
                },
                replyTo: replyToSetting === 'newsletter' ? undefined : {address: replyToSetting}
            });

            if (addresses.replyTo) {
                replyTo = EmailAddressParser.stringify(addresses.replyTo);
            }
        }

        return {
            from,
            ...(replyTo ? {
                replyTo
            } : {})
        };
    }

    async #getSenderOptions() {
        if (this.#defaultNewsletterSenderOptions) {
            return this.#defaultNewsletterSenderOptions;
        }

        this.#defaultNewsletterSenderOptions = await this.#getDefaultNewsletterSenderOptions();
        return this.#defaultNewsletterSenderOptions;
    }

    async #getEffectiveSenderOptions(automatedSender = {}) {
        const defaultOptions = await this.#getSenderOptions();
        const defaultFrom = EmailAddressParser.parse(defaultOptions.from || '') || emailAddressService.service.defaultFromEmail;
        const defaultReplyTo = defaultOptions.replyTo ? EmailAddressParser.parse(defaultOptions.replyTo) : undefined;

        const senderName = trimValue(automatedSender.senderName) || defaultFrom?.name || undefined;
        const senderEmail = trimValue(automatedSender.senderEmail) || defaultFrom.address;
        const senderReplyTo = trimValue(automatedSender.senderReplyTo);

        const addresses = emailAddressService.service.getAddress({
            from: {
                address: senderEmail,
                ...(senderName ? {name: senderName} : {})
            },
            replyTo: senderReplyTo ? {address: senderReplyTo} : defaultReplyTo
        });

        return {
            from: EmailAddressParser.stringify(addresses.from),
            ...(addresses.replyTo ? {
                replyTo: EmailAddressParser.stringify(addresses.replyTo)
            } : {})
        };
    }

    async #loadWelcomeEmailsCollection() {
        return Automation.findAll({
            filter: WELCOME_EMAIL_FILTER,
            withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
        });
    }

    async #getDefaultEmailDesignSettings() {
        const designSettings = await EmailDesignSetting.findOne({
            slug: DEFAULT_EMAIL_DESIGN_SETTING_SLUG
        });

        if (!designSettings?.id) {
            throw new errors.NotFoundError({
                message: 'Default automated email design setting not found'
            });
        }

        return designSettings;
    }

    #normalizeSharedSenderValue(value) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed === '' ? null : trimmed;
        }

        return value;
    }

    #normalizeSharedSenderAttrs(attrs = {}) {
        const normalized = {};

        for (const field of SHARED_SENDER_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(attrs, field)) {
                continue;
            }

            normalized[field] = this.#normalizeSharedSenderValue(attrs[field]);
        }

        return normalized;
    }

    #validateSharedSenderField(field, value) {
        const validationType = EMAIL_VALIDATION_TYPE_BY_FIELD[field];

        if (!validationType || !value) {
            return {
                requiresVerification: false
            };
        }

        const validated = emailAddressService.service.validate(value, validationType);
        if (!validated.allowed) {
            throw new errors.ValidationError({
                message: `You cannot set ${field} to ${value}`
            });
        }

        return {
            requiresVerification: validated.verificationEmailRequired
        };
    }

    async #prepareSharedSenderUpdate(attrs = {}) {
        const designSettings = await this.#getDefaultEmailDesignSettings();
        const normalizedAttrs = this.#normalizeSharedSenderAttrs(attrs);
        const attrsToPersist = {};
        const emailsToVerify = [];

        for (const [field, value] of Object.entries(normalizedAttrs)) {
            if (trimValue(designSettings.get(field)) === trimValue(value)) {
                continue;
            }

            const {requiresVerification} = this.#validateSharedSenderField(field, value);
            if (requiresVerification) {
                emailsToVerify.push({property: field, email: value});
                continue;
            }

            attrsToPersist[field] = value;
        }

        return {
            attrsToPersist,
            emailsToVerify,
            designSettings
        };
    }

    async #sendSharedSenderVerifications(emailsToVerify = []) {
        for (const {property, email} of emailsToVerify) {
            await this.#sendEmailVerificationMagicLink({property, email});
        }
    }

    async #sendEmailVerificationMagicLink({email, property}) {
        const fromEmail = emailAddressService.service.defaultFromEmail;

        this.#magicLinkService.transporter = {
            sendMail: (message) => {
                if (process.env.NODE_ENV !== 'production') {
                    logging.warn(message.text);
                }

                return this.#mailer.send({
                    from: fromEmail,
                    subject: 'Verify email address',
                    forceTextContent: true,
                    ...message
                });
            }
        };

        return this.#magicLinkService.sendMagicLink({
            email,
            tokenData: {
                property,
                value: email
            }
        });
    }

    async loadMemberWelcomeEmails() {
        this.#defaultNewsletterSenderOptions = await this.#getDefaultNewsletterSenderOptions();

        for (const [memberStatus, slug] of Object.entries(MEMBER_WELCOME_EMAIL_SLUGS)) {
            const row = await Automation.findOne({slug}, {
                withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
            });

            if (!row) {
                this.#memberWelcomeEmails[memberStatus] = null;
                continue;
            }

            const email = row.related('welcomeEmailAutomatedEmail');

            if (!email || !email.get('lexical')) {
                this.#memberWelcomeEmails[memberStatus] = null;
                continue;
            }

            const designSettings = email.related('emailDesignSetting');

            this.#memberWelcomeEmails[memberStatus] = {
                lexical: email.get('lexical'),
                subject: email.get('subject'),
                status: row.get('status'),
                designSettings: designSettings?.id ? designSettings.toJSON() : null
            };
        }
    }

    /**
     * @param {object} options
     * @param {object} options.member
     * @param {undefined | null | string} options.member.name
     * @param {string} options.member.email
     * @param {string} options.member.uuid
     * @param {'free' | 'paid'} options.memberStatus
     * @param {object} options.email
     * @param {string} options.email.lexical
     * @param {string} options.email.subject
     * @param {null | object} options.email.designSettings
     * @param {'welcome' | 'automation'} options.emailType
     * @param {null | {url: string, oneClickUrl: string}} [options.unsubscribe] - When set, the footer links to an unsubscribe URL and the email carries one-click List-Unsubscribe headers
     * @returns {Promise<void>}
     */
    async #sendEmail({member, memberStatus, email, emailType, unsubscribe = null}) {
        if (!member.email) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.MISSING_RECIPIENT_EMAIL
            });
        }

        const name = member?.name ? `${member.name} at ` : '';
        logging.info({
            system: {
                event: emailType === 'automation' ? 'member_welcome_email.automation_sending' : 'member_welcome_email.sending',
                member_status: memberStatus
            }
        }, `${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending ${emailType} email to ${name}${member.email}`);

        const {html, text, subject} = await this.#renderer.render({
            lexical: email.lexical,
            subject: email.subject,
            designSettings: email.designSettings,
            member: {
                name: member.name,
                email: member.email,
                uuid: member.uuid
            },
            siteSettings: this.#getSiteSettings(),
            unsubscribeUrl: unsubscribe?.url
        });

        const senderOptions = await this.#getEffectiveSenderOptions(
            getSenderDetails(email.designSettings)
        );

        const headers = unsubscribe?.oneClickUrl ? {
            'List-Unsubscribe': `<${unsubscribe.oneClickUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        } : undefined;

        await this.#mailer.send({
            to: member.email,
            subject,
            html,
            text,
            forceTextContent: true,
            tags: [MEMBER_WELCOME_EMAIL_TAG],
            ...(headers ? {headers} : {}),
            ...senderOptions
        });
    }

    async send({member, memberStatus}) {
        const email = this.#memberWelcomeEmails[memberStatus];

        if (!email) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        if (email.status !== 'active') {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.memberWelcomeEmailInactive(memberStatus)
            });
        }

        await this.#sendEmail({
            member,
            memberStatus,
            emailType: 'welcome',
            email
        });
    }

    // TODO(NY-1319) This isn't the right place for automation email sends. We
    // should do a refactor to get this out of here.
    /**
     * @param {object} options
     * @param {object} options.email
     * @param {null | string} options.email.designSettingId
     * @param {string} options.email.lexical
     * @param {string} options.email.subject
     * @param {object} options.member
     * @param {string} options.member.email
     * @param {null | string} options.member.name
     * @param {string} options.member.uuid
     * @param {'free' | 'paid'} options.memberStatus
     * @returns {Promise<void>}
     */
    async sendAutomationEmail({email, member, memberStatus}) {
        const designSettings = email.designSettingId ?
            await EmailDesignSetting.findOne({id: email.designSettingId}) :
            null;
        const designSettingsJson = designSettings?.id ? designSettings.toJSON() : null;

        // Real automation sends carry an unsubscribe link to the "Updates & Announcements"
        // preference. The visible footer link and the one-click List-Unsubscribe header both point
        // at the same /unsubscribe/?...&updatesAndAnnouncements=1 URL (handled by the unsubscribe
        // controller), just like newsletters. Preview/test sends render separately and never reach
        // this path.
        const unsubscribeUrl = labs.isSet('automations') && member.uuid ?
            settingsHelpers.createUnsubscribeUrl(member.uuid, {updatesAndAnnouncements: true}) :
            null;
        const unsubscribe = unsubscribeUrl ? {url: unsubscribeUrl, oneClickUrl: unsubscribeUrl} : null;

        await this.#sendEmail({
            member,
            memberStatus,
            emailType: 'automation',
            email: {
                lexical: email.lexical,
                subject: email.subject,
                designSettings: designSettingsJson
            },
            unsubscribe
        });
    }

    async isMemberWelcomeEmailActive(memberStatus = 'free') {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[memberStatus];

        if (!slug) {
            return false;
        }

        const row = await Automation.findOne({slug}, {withRelated: ['welcomeEmailAutomatedEmail']});
        if (!row) {
            return false;
        }
        const email = row.related('welcomeEmailAutomatedEmail');
        return Boolean(email && email.get('lexical') && row.get('status') === 'active');
    }

    async #renderAutomationEmailPreview({automationId, subject, lexical, memberEmail = 'jamie@example.com', requireWelcomeEmail = false}) {
        const automation = await Automation.findOne({id: automationId}, {
            withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
        });
        const automatedEmail = automation?.related('welcomeEmailAutomatedEmail');

        if (!automation || (requireWelcomeEmail && !automatedEmail?.id)) {
            throw new errors.NotFoundError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        if (typeof lexical !== 'string' || !lexical.trim()) {
            throw new errors.ValidationError({
                message: MESSAGES.MISSING_EMAIL_CONTENT
            });
        }

        if (typeof subject !== 'string' || !subject.trim()) {
            throw new errors.ValidationError({
                message: MESSAGES.MISSING_EMAIL_SUBJECT
            });
        }

        const testMember = {
            name: 'Jamie Larson',
            email: memberEmail,
            uuid: '00000000-0000-4000-8000-000000000000'
        };

        const designSettings = requireWelcomeEmail ?
            automatedEmail.related('emailDesignSetting') :
            await this.#getDefaultEmailDesignSettings();
        const designSettingsJson = designSettings?.id ? designSettings.toJSON() : null;

        const preview = await this.#renderer.render({
            lexical,
            subject,
            designSettings: designSettingsJson,
            member: testMember,
            siteSettings: this.#getSiteSettings()
        });

        return {
            ...preview,
            designSettings
        };
    }

    async previewEmail({subject, lexical, automatedEmailId}) {
        const {html, text, subject: renderedSubject} = await this.#renderAutomationEmailPreview({
            automationId: automatedEmailId,
            requireWelcomeEmail: true,
            subject,
            lexical
        });

        return {
            html,
            plaintext: text,
            subject: renderedSubject
        };
    }

    async previewAutomationEmail({subject, lexical, automationId}) {
        const {html, text, subject: renderedSubject} = await this.#renderAutomationEmailPreview({
            automationId,
            subject,
            lexical
        });

        return {
            html,
            plaintext: text,
            subject: renderedSubject
        };
    }

    async sendTestEmail({email, subject, lexical, automatedEmailId}) {
        await this.#sendTestAutomationEmail({
            email,
            subject,
            lexical,
            automationId: automatedEmailId,
            requireWelcomeEmail: true
        });
    }

    async sendTestAutomationEmail({email, subject, lexical, automationId}) {
        await this.#sendTestAutomationEmail({
            email,
            subject,
            lexical,
            automationId
        });
    }

    async #sendTestAutomationEmail({email, subject, lexical, automationId, requireWelcomeEmail = false}) {
        const {
            html,
            text,
            subject: renderedSubject,
            designSettings
        } = await this.#renderAutomationEmailPreview({
            automationId,
            requireWelcomeEmail,
            subject,
            lexical,
            memberEmail: email
        });

        // Test sends should always reflect latest newsletter fallback values.
        this.#defaultNewsletterSenderOptions = await this.#getDefaultNewsletterSenderOptions();
        const designSettingsJson = designSettings?.id ? designSettings.toJSON() : null;
        const senderOptions = await this.#getEffectiveSenderOptions(
            getSenderDetails(designSettingsJson)
        );

        await this.#mailer.send({
            to: email,
            subject: `[Test] ${renderedSubject}`,
            html,
            text,
            forceTextContent: true,
            ...senderOptions
        });
    }

    async editSharedSenderOptions(attrs = {}) {
        const {attrsToPersist, emailsToVerify, designSettings} = await this.#prepareSharedSenderUpdate(attrs);

        if (Object.keys(attrsToPersist).length > 0) {
            await EmailDesignSetting.edit(attrsToPersist, {id: designSettings.id});
        }

        await this.#sendSharedSenderVerifications(emailsToVerify);

        const response = await this.#loadWelcomeEmailsCollection();
        if (emailsToVerify.length > 0) {
            return {
                data: response.models,
                meta: {
                    ...response.meta,
                    sent_email_verification: emailsToVerify.map(({property}) => property)
                }
            };
        }

        return {
            data: response.models,
            meta: response.meta
        };
    }

    async verifySenderPropertyUpdate(token) {
        const data = await this.#magicLinkService.getDataFromToken(token);
        const {property, value} = data;

        if (!VERIFIED_SENDER_PROPERTIES.includes(property)) {
            throw new errors.IncorrectUsageError({
                message: 'Not allowed to update this sender setting via token'
            });
        }

        const normalizedValue = this.#normalizeSharedSenderValue(value);
        const attrs = {
            [property]: normalizedValue
        };

        const designSettings = await this.#getDefaultEmailDesignSettings();
        await EmailDesignSetting.edit(attrs, {id: designSettings.id});

        const response = await this.#loadWelcomeEmailsCollection();
        return {
            data: response.models,
            meta: {
                ...response.meta,
                email_verified: property
            }
        };
    }
}

class MemberWelcomeEmailServiceWrapper {
    init() {
        if (this.api) {
            return;
        }

        if (!this.i18n) {
            const i18nLib = require('@tryghost/i18n');
            const events = require('../../lib/common/events');

            this.i18n = i18nLib(settingsCache.get('locale') || 'en', 'ghost');

            events.on('settings.locale.edited', (model) => {
                this.i18n.changeLanguage(model.get('value'));
            });
        }

        const SingleUseTokenProvider = require('../members/single-use-token-provider');
        const models = require('../../models');

        this.api = new MemberWelcomeEmailService({
            t: this.i18n.t,
            dir: this.i18n.dir.bind(this.i18n),
            singleUseTokenProvider: new SingleUseTokenProvider({
                SingleUseTokenModel: models.SingleUseToken,
                validityPeriod: 24 * 60 * 60 * 1000,
                validityPeriodAfterUsage: 10 * 60 * 1000,
                maxUsageCount: 7
            })
        });
    }
}

module.exports = new MemberWelcomeEmailServiceWrapper();
