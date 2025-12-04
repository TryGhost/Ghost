const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const emailAddressService = require('../email-address');
const mail = require('../mail');
// @ts-expect-error type checker has trouble with the dynamic exporting in models
const {AutomatedEmail} = require('../../models');
const MemberWelcomeEmailRenderer = require('./MemberWelcomeEmailRenderer');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MESSAGES} = require('./constants');

const FREE_WELCOME_EMAIL_SLUG = 'member-welcome-email-free';

class MemberWelcomeEmailService {
    #mailer;
    #renderer;
    #template = null;

    constructor() {
        emailAddressService.init();
        this.#mailer = new mail.GhostMailer();
        this.#renderer = new MemberWelcomeEmailRenderer();
    }

    async loadTemplate() {
        const template = await AutomatedEmail.findOne({slug: FREE_WELCOME_EMAIL_SLUG});

        if (!template || !template.get('lexical')) {
            this.#template = null;
            return;
        }

        this.#template = {
            lexical: template.get('lexical'),
            subject: template.get('subject'),
            senderName: template.get('sender_name'),
            senderEmail: template.get('sender_email'),
            senderReplyTo: template.get('sender_reply_to')
        };
    }

    async send({member}) {
        const name = member?.name ? `${member.name} at ` : '';
        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${member?.email}`);

        if (!this.#template) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.NO_EMAIL_TEMPLATE
            });
        }

        const siteSettings = {
            title: settingsCache.get('title') || 'Ghost',
            url: urlUtils.urlFor('home', true),
            accentColor: settingsCache.get('accent_color') || '#15212A'
        };

        const {html, text, subject} = await this.#renderer.render({
            lexical: this.#template.lexical,
            subject: this.#template.subject,
            member: {
                name: member.name,
                email: member.email
            },
            siteSettings
        });

        const toEmail = config.get('memberWelcomeEmailTestInbox');
        if (!toEmail) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.MISSING_TEST_INBOX_CONFIG
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

