const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const emailAddressService = require('../email-address');
const mail = require('../mail');
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
        const db = require('../../data/db');
        const template = await db.knex('automated_emails')
            .where('slug', FREE_WELCOME_EMAIL_SLUG)
            .first('lexical', 'subject', 'sender_name', 'sender_email', 'sender_reply_to');

        if (!template || !template.lexical) {
            this.#template = null;
            return;
        }

        this.#template = {
            lexical: urlUtils.transformReadyToAbsolute(template.lexical),
            subject: template.subject,
            senderName: template.sender_name,
            senderEmail: template.sender_email,
            senderReplyTo: template.sender_reply_to
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
                message: 'memberWelcomeEmailTestInbox config is required but not defined'
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

