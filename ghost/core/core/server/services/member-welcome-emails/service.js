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
// @ts-expect-error type checker has trouble with the dynamic exporting in models
const {WelcomeEmailAutomation, WelcomeEmailAutomatedEmail, Newsletter} = require('../../models');
const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MEMBER_WELCOME_EMAIL_TAG, MEMBER_WELCOME_EMAIL_SLUGS, MESSAGES} = require('./constants');

const VERIFIED_SENDER_PROPERTIES = ['sender_reply_to'];
const WELCOME_EMAIL_FILTER = `slug:${MEMBER_WELCOME_EMAIL_SLUGS.free},slug:${MEMBER_WELCOME_EMAIL_SLUGS.paid}`;
const SHARED_SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];
const EMAIL_VALIDATION_TYPE_BY_FIELD = {
    sender_email: 'from',
    sender_reply_to: 'replyTo'
};

const trimValue = value => value?.trim() || '';

class MemberWelcomeEmailService {
    #mailer;
    #renderer;
    #magicLinkService;
    #memberWelcomeEmails = {free: null, paid: null};
    #defaultNewsletterSenderOptions = null;

    constructor({t, singleUseTokenProvider}) {
        emailAddressService.init();
        this.#mailer = new mail.GhostMailer();
        this.#renderer = new MemberWelcomeEmailRenderer({t});

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
            }, true) : null
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
        return WelcomeEmailAutomation.findAll({
            filter: WELCOME_EMAIL_FILTER,
            withRelated: ['welcomeEmailAutomatedEmail']
        });
    }

    async #loadWelcomeEmailsMap({requireAll = false} = {}) {
        const rows = await this.#loadWelcomeEmailsCollection();
        const bySlug = new Map(rows.models.map(model => [model.get('slug'), model]));

        const free = bySlug.get(MEMBER_WELCOME_EMAIL_SLUGS.free);
        const paid = bySlug.get(MEMBER_WELCOME_EMAIL_SLUGS.paid);

        if (requireAll && (!free || !paid)) {
            throw new errors.NotFoundError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        return {free, paid};
    }

    async #loadRequiredWelcomeEmailRows() {
        const {free, paid} = await this.#loadWelcomeEmailsMap({requireAll: true});

        if (!free.related('welcomeEmailAutomatedEmail')?.id || !paid.related('welcomeEmailAutomatedEmail')?.id) {
            throw new errors.NotFoundError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        return [free, paid];
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

    #hasSharedSenderFieldChanged(rows, field, value) {
        return rows.some((row) => {
            const currentValue = row.related('welcomeEmailAutomatedEmail')?.get(field);
            return trimValue(currentValue) !== trimValue(value);
        });
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

    #prepareSharedSenderUpdate(rows, attrs = {}) {
        const normalizedAttrs = this.#normalizeSharedSenderAttrs(attrs);
        const attrsToPersist = {};
        const emailsToVerify = [];

        for (const [field, value] of Object.entries(normalizedAttrs)) {
            if (!this.#hasSharedSenderFieldChanged(rows, field, value)) {
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
            emailsToVerify
        };
    }

    async #applySharedSenderAttrs(rows, attrs = {}) {
        if (Object.keys(attrs).length === 0) {
            return;
        }

        await Promise.all(rows.map((row) => {
            const email = row.related('welcomeEmailAutomatedEmail');
            return WelcomeEmailAutomatedEmail.edit(attrs, {id: email.id});
        }));
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
            const row = await WelcomeEmailAutomation.findOne({slug}, {
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
                designSettings: designSettings?.id ? designSettings.toJSON() : null,
                senderName: email.get('sender_name'),
                senderEmail: email.get('sender_email'),
                senderReplyTo: email.get('sender_reply_to')
            };
        }
    }

    async send({member, memberStatus}) {
        if (!member.email) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.MISSING_RECIPIENT_EMAIL
            });
        }

        const name = member?.name ? `${member.name} at ` : '';
        logging.info({
            system: {
                event: 'member_welcome_email.sending',
                member_status: memberStatus
            }
        }, `${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${member.email}`);

        const memberWelcomeEmail = this.#memberWelcomeEmails[memberStatus];

        if (!memberWelcomeEmail) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        if (memberWelcomeEmail.status !== 'active') {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.memberWelcomeEmailInactive(memberStatus)
            });
        }

        const {html, text, subject} = await this.#renderer.render({
            lexical: memberWelcomeEmail.lexical,
            subject: memberWelcomeEmail.subject,
            designSettings: memberWelcomeEmail.designSettings,
            member: {
                name: member.name,
                email: member.email,
                uuid: member.uuid
            },
            siteSettings: this.#getSiteSettings()
        });

        const senderOptions = await this.#getEffectiveSenderOptions(memberWelcomeEmail);

        await this.#mailer.send({
            to: member.email,
            subject,
            html,
            text,
            forceTextContent: true,
            tags: [MEMBER_WELCOME_EMAIL_TAG],
            ...senderOptions
        });
    }

    async isMemberWelcomeEmailActive(memberStatus = 'free') {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[memberStatus];

        if (!slug) {
            return false;
        }

        const row = await WelcomeEmailAutomation.findOne({slug}, {withRelated: ['welcomeEmailAutomatedEmail']});
        if (!row) {
            return false;
        }
        const email = row.related('welcomeEmailAutomatedEmail');
        return Boolean(email && email.get('lexical') && row.get('status') === 'active');
    }

    async #renderWelcomeEmailPreview({automatedEmailId, subject, lexical, memberEmail = 'jamie@example.com'}) {
        // Still validate the automated email exists (for permission purposes)
        const automation = await WelcomeEmailAutomation.findOne({id: automatedEmailId}, {
            withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
        });
        const automatedEmail = automation?.related('welcomeEmailAutomatedEmail');

        if (!automation || !automatedEmail?.id) {
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

        const designSettings = automatedEmail.related('emailDesignSetting');

        const preview = await this.#renderer.render({
            lexical,
            subject,
            designSettings: designSettings?.id ? designSettings.toJSON() : null,
            member: testMember,
            siteSettings: this.#getSiteSettings()
        });

        return {
            ...preview,
            automatedEmail
        };
    }

    async previewEmail({subject, lexical, automatedEmailId}) {
        const {html, text, subject: renderedSubject} = await this.#renderWelcomeEmailPreview({
            automatedEmailId,
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
        const {html, text, subject: renderedSubject, automatedEmail} = await this.#renderWelcomeEmailPreview({
            automatedEmailId,
            subject,
            lexical,
            memberEmail: email
        });

        // Test sends should always reflect latest newsletter fallback values.
        this.#defaultNewsletterSenderOptions = await this.#getDefaultNewsletterSenderOptions();
        const senderOptions = await this.#getEffectiveSenderOptions({
            senderName: automatedEmail.get('sender_name'),
            senderEmail: automatedEmail.get('sender_email'),
            senderReplyTo: automatedEmail.get('sender_reply_to')
        });

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
        const rows = await this.#loadRequiredWelcomeEmailRows();
        const {attrsToPersist, emailsToVerify} = this.#prepareSharedSenderUpdate(rows, attrs);

        await this.#applySharedSenderAttrs(rows, attrsToPersist);
        await this.#sendSharedSenderVerifications(emailsToVerify);

        const response = await this.#loadWelcomeEmailsCollection();
        if (emailsToVerify.length > 0) {
            response.meta = response.meta || {};
            response.meta.sent_email_verification = emailsToVerify.map(({property}) => property);
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

        const rows = await this.#loadRequiredWelcomeEmailRows();
        const normalizedValue = this.#normalizeSharedSenderValue(value);
        const attrs = {
            [property]: normalizedValue
        };

        await this.#applySharedSenderAttrs(rows, attrs);

        const response = await this.#loadWelcomeEmailsCollection();
        response.meta = response.meta || {};
        response.meta.email_verified = property;
        return {
            data: response.models,
            meta: response.meta
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
