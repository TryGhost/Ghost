const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const emailAddressService = require('../email-address');
const mail = require('../mail');
// @ts-expect-error type checker has trouble with the dynamic exporting in models
const {AutomatedEmail} = require('../../models');
const MemberWelcomeEmailRenderer = require('./MemberWelcomeEmailRenderer');
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

    async send({member, memberStatus = 'free'}) {
        const name = member?.name ? `${member.name} at ` : '';
        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${member?.email}`);

        if (!member?.email) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.MISSING_MEMBER_EMAIL_ADDRESS
            });
        }

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

        const siteSettings = {
            title: settingsCache.get('title') || 'Ghost',
            url: urlUtils.urlFor('home', true),
            accentColor: settingsCache.get('accent_color') || '#15212A'
        };

        const {html, text, subject} = await this.#renderer.render({
            lexical: memberWelcomeEmail.lexical,
            subject: memberWelcomeEmail.subject,
            member: {
                name: member.name,
                email: member.email
            },
            siteSettings
        });

        await this.#mailer.send({
            to: member.email,
            subject,
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

