// Filename must match the docName specified in ../../../automated-emails.js
/* eslint-disable ghost/filenames/match-regex */

const validator = require('@tryghost/validator');
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const ALLOWED_STATUSES = ['inactive', 'active'];
const ALLOWED_NAMES = ['Welcome Email (Free)', 'Welcome Email (Paid)'];
const ALLOWED_SLUGS = ['member-welcome-email-free', 'member-welcome-email-paid'];

const messages = {
    invalidStatus: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    invalidLexical: 'Lexical must be a valid JSON string',
    invalidSlug: `Slug must be one of: ${ALLOWED_SLUGS.join(', ')}`,
    invalidName: `Name must be one of: ${ALLOWED_NAMES.join(', ')}`,
    invalidEmailReceived: 'The server did not receive a valid email',
    subjectRequired: 'Subject is required',
    lexicalRequired: 'Email content is required'
};

const validateAutomatedEmail = async function (frame) {
    if (!frame.data.automated_emails || !frame.data.automated_emails[0]) {
        return Promise.resolve();
    }

    const data = frame.data.automated_emails[0];

    if (!data.name || !ALLOWED_NAMES.includes(data.name)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidName),
            property: 'name'
        }));
    }

    if (data.status && !ALLOWED_STATUSES.includes(data.status)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidStatus),
            property: 'status'
        }));
    }

    if (data.slug && !ALLOWED_SLUGS.includes(data.slug)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidSlug),
            property: 'slug'
        }));
    }

    if (data.lexical) {
        try {
            JSON.parse(data.lexical);
        } catch (e) {
            return Promise.reject(new ValidationError({
                message: tpl(messages.invalidLexical),
                property: 'lexical'
            }));
        }
    }

    return Promise.resolve();
};

module.exports = {
    async add(apiConfig, frame) {
        await validateAutomatedEmail(frame);
    },
    async edit(apiConfig, frame) {
        await validateAutomatedEmail(frame);
    },
    sendTestEmail(apiConfig, frame) {
        const email = frame.data.email;
        const subject = frame.data.subject;
        const lexical = frame.data.lexical;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new ValidationError({
                message: tpl(messages.invalidEmailReceived)
            });
        }

        if (typeof subject !== 'string' || !subject.trim()) {
            throw new ValidationError({
                message: tpl(messages.subjectRequired)
            });
        }

        if (typeof lexical !== 'string' || !lexical.trim()) {
            throw new ValidationError({
                message: tpl(messages.lexicalRequired)
            });
        }

        try {
            JSON.parse(lexical);
        } catch (e) {
            throw new ValidationError({
                message: tpl(messages.invalidLexical)
            });
        }
    }
};
