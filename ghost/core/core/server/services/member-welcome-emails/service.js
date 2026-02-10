const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const emailAddressService = require('../email-address');
const mail = require('../mail');
// @ts-expect-error type checker has trouble with the dynamic exporting in models
const {AutomatedEmail} = require('../../models');
const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MEMBER_WELCOME_EMAIL_SLUGS, MESSAGES} = require('./constants');

class MemberWelcomeEmailService {
    #mailer;
    #renderer;
    #memberWelcomeEmails = {free: null, paid: null};

    constructor() {
        emailAddressService.init();
        this.#mailer = new mail.GhostMailer();
        this.#renderer = new MemberWelcomeEmailRenderer();
    }

    #getSiteSettings() {
        return {
            title: settingsCache.get('title') || 'Ghost',
            url: urlUtils.urlFor('home', true),
            accentColor: settingsCache.get('accent_color') || '#15212A'
        };
    }

    async loadMemberWelcomeEmails() {
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
        const name = member?.name ? `${member.name} at ` : '';
        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${member?.email}`);

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

        const testInbox = config.get('memberWelcomeEmailTestInbox');
        const toEmail = testInbox || member.email;

        if (!toEmail) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.MISSING_RECIPIENT_EMAIL
            });
        }

        await this.#mailer.send({
            to: toEmail,
            subject,
            html,
            text,
            forceTextContent: true
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

        await this.#mailer.send({
            to: email,
            subject: `[Test] ${renderedSubject}`,
            html,
            text,
            forceTextContent: true
        });
    }
}

class MemberWelcomeEmailServiceWrapper {
    init() {
        if (this.api) {
            return;
        }
        this.api = new MemberWelcomeEmailService();
    }
}

module.exports = new MemberWelcomeEmailServiceWrapper();

