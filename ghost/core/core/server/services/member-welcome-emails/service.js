const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const emailAddressService = require('../email-address');
const settingsHelpers = require('../settings-helpers');
const EmailAddressParser = require('../email-address/email-address-parser');
const mail = require('../mail');
// @ts-expect-error type checker has trouble with the dynamic exporting in models
const {AutomatedEmail, Newsletter} = require('../../models');
const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MEMBER_WELCOME_EMAIL_SLUGS, MESSAGES} = require('./constants');

class MemberWelcomeEmailService {
    #mailer;
    #renderer;
    #memberWelcomeEmails = {free: null, paid: null};
    #defaultNewsletterSenderOptions = null;

    constructor({t}) {
        emailAddressService.init();
        this.#mailer = new mail.GhostMailer();
        this.#renderer = new MemberWelcomeEmailRenderer({t});
    }

    #getSiteSettings() {
        return {
            title: settingsCache.get('title') || 'Ghost',
            url: urlUtils.urlFor('home', true),
            accentColor: settingsCache.get('accent_color') || '#15212A'
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

    async loadMemberWelcomeEmails() {
        this.#defaultNewsletterSenderOptions = await this.#getDefaultNewsletterSenderOptions();

        for (const [memberStatus, slug] of Object.entries(MEMBER_WELCOME_EMAIL_SLUGS)) {
            const row = await AutomatedEmail.findOne({slug});

            if (!row || !row.get('lexical')) {
                this.#memberWelcomeEmails[memberStatus] = null;
                continue;
            }

            this.#memberWelcomeEmails[memberStatus] = {
                lexical: row.get('lexical'),
                subject: row.get('subject'),
                status: row.get('status'),
                senderName: row.get('sender_name'),
                senderEmail: row.get('sender_email'),
                senderReplyTo: row.get('sender_reply_to')
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
        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${member.email}`);

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
            member: {
                name: member.name,
                email: member.email
            },
            siteSettings: this.#getSiteSettings()
        });

        const senderOptions = await this.#getSenderOptions();

        await this.#mailer.send({
            to: member.email,
            subject,
            html,
            text,
            forceTextContent: true,
            ...senderOptions
        });
    }

    async isMemberWelcomeEmailActive(memberStatus = 'free') {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[memberStatus];

        if (!slug) {
            return false;
        }

        const row = await AutomatedEmail.findOne({slug});
        return Boolean(row && row.get('lexical') && row.get('status') === 'active');
    }

    async sendTestEmail({email, subject, lexical, automatedEmailId}) {
        // Still validate the automated email exists (for permission purposes)
        const automatedEmail = await AutomatedEmail.findOne({id: automatedEmailId});

        if (!automatedEmail) {
            throw new errors.NotFoundError({
                message: MESSAGES.NO_MEMBER_WELCOME_EMAIL
            });
        }

        if (!lexical) {
            throw new errors.ValidationError({
                message: MESSAGES.MISSING_EMAIL_CONTENT
            });
        }

        if (!subject) {
            throw new errors.ValidationError({
                message: MESSAGES.MISSING_EMAIL_SUBJECT
            });
        }

        const testMember = {
            name: 'Jamie Larson',
            email: email
        };

        const {html, text, subject: renderedSubject} = await this.#renderer.render({
            lexical,
            subject,
            member: testMember,
            siteSettings: this.#getSiteSettings()
        });

        // Test sends should always reflect the latest newsletter sender settings.
        const senderOptions = await this.#getDefaultNewsletterSenderOptions();

        await this.#mailer.send({
            to: email,
            subject: `[Test] ${renderedSubject}`,
            html,
            text,
            forceTextContent: true,
            ...senderOptions
        });
    }
}

class MemberWelcomeEmailServiceWrapper {
    init() {
        if (this.api) {
            return;
        }

        const i18nLib = require('@tryghost/i18n');
        const events = require('../../lib/common/events');

        const i18n = i18nLib(settingsCache.get('locale') || 'en', 'ghost');

        events.on('settings.locale.edited', (model) => {
            i18n.changeLanguage(model.get('value'));
        });

        this.api = new MemberWelcomeEmailService({t: i18n.t});
    }
}

module.exports = new MemberWelcomeEmailServiceWrapper();
