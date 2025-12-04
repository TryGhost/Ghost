const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const lexicalLib = require('../../lib/lexical');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MESSAGES} = require('./constants');
const config = require('../../../shared/config');

/** @typedef {import('./get-mail-config').MailConfig} MailConfig */

let compiledTemplate = null;

async function getCompiledTemplate() {
    if (!compiledTemplate) {
        const [templateSource, stylesPartial] = await Promise.all([
            fs.readFile(path.join(__dirname, './email-templates/wrapper.hbs'), 'utf8'),
            fs.readFile(path.join(__dirname, '../staff/email-templates/partials/styles.hbs'), 'utf8')
        ]);
        Handlebars.registerPartial('styles', stylesPartial);
        compiledTemplate = Handlebars.compile(templateSource);
    }
    return compiledTemplate;
}

function validateLexicalContent(lexical) {
    if (!lexical || typeof lexical !== 'string') {
        throw new errors.IncorrectUsageError({
            message: MESSAGES.EMPTY_LEXICAL_CONTENT
        });
    }

    try {
        const parsed = JSON.parse(lexical);
        if (!parsed.root || !Array.isArray(parsed.root.children) || parsed.root.children.length === 0) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.EMPTY_LEXICAL_CONTENT
            });
        }
    } catch (err) {
        if (err instanceof errors.IncorrectUsageError) {
            throw err;
        }
        throw new errors.IncorrectUsageError({
            message: MESSAGES.INVALID_LEXICAL_STRUCTURE,
            context: err.message
        });
    }
}

function replaceTemplateVariables(str, {siteSettings, member}) {
    const memberName = member.name || 'there';
    const firstName = memberName.split(' ')[0];

    return str
        .replace(/\{\{site\.title\}\}/g, siteSettings.title)
        .replace(/\{\{site\.url\}\}/g, siteSettings.url)
        .replace(/\{\{member\.name\}\}/g, memberName)
        .replace(/\{\{member\.email\}\}/g, member.email || '')
        .replace(/\{\{member\.firstname\}\}/g, firstName);
}

/**
 * Sends a welcome email to a new member
 * @param {Object} options
 * @param {Object} options.payload - Member data containing name and email
 * @param {MailConfig} options.mailConfig - Preloaded mailer + site settings shared across job
 */
async function sendMemberWelcomeEmail({payload, mailConfig}) {
    const name = payload?.name ? `${payload.name} at ` : '';
    logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${payload?.email}`);

    if (!mailConfig.emailTemplate) {
        throw new errors.IncorrectUsageError({
            message: MESSAGES.NO_EMAIL_TEMPLATE
        });
    }

    validateLexicalContent(mailConfig.emailTemplate.lexical);

    const replacementData = {
        siteSettings: mailConfig.siteSettings,
        member: {
            name: payload.name,
            email: payload.email
        }
    };

    let content;
    try {
        content = await lexicalLib.render(mailConfig.emailTemplate.lexical, {target: 'email'});
    } catch (err) {
        throw new errors.IncorrectUsageError({
            message: MESSAGES.INVALID_LEXICAL_STRUCTURE,
            context: err.message
        });
    }

    content = replaceTemplateVariables(content, replacementData);
    const subject = replaceTemplateVariables(mailConfig.emailTemplate.subject, replacementData);

    const template = await getCompiledTemplate();

    const html = template({
        content,
        subject,
        siteTitle: mailConfig.siteSettings.title,
        siteUrl: mailConfig.siteSettings.url,
        accentColor: mailConfig.siteSettings.accentColor
    });

    const text = htmlToPlaintext.email(html);

    const toEmail = config.get('memberWelcomeEmailTestInbox');
    if (!toEmail) {
        throw new errors.IncorrectUsageError({
            message: 'memberWelcomeEmailTestInbox config is required but not defined'
        });
    }

    await mailConfig.mailer.send({
        to: toEmail,
        subject,
        html,
        text,
        forceTextContent: true
    });
}

module.exports = sendMemberWelcomeEmail;
