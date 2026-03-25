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
    bulkEditRequiresArray: 'Bulk edit requires an array of automated emails',
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

const validateBulkEditEmail = function (data) {
    if (!data.id) {
        throw new ValidationError({
            message: 'Each automated email in bulk edit must have an id',
            property: 'id'
        });
    }

    if (data.status && !ALLOWED_STATUSES.includes(data.status)) {
        throw new ValidationError({
            message: tpl(messages.invalidStatus),
            property: 'status'
        });
    }

    if (data.slug && !ALLOWED_SLUGS.includes(data.slug)) {
        throw new ValidationError({
            message: tpl(messages.invalidSlug),
            property: 'slug'
        });
    }

    if (data.name && !ALLOWED_NAMES.includes(data.name)) {
        throw new ValidationError({
            message: tpl(messages.invalidName),
            property: 'name'
        });
    }

    if (data.lexical) {
        try {
            JSON.parse(data.lexical);
        } catch (e) {
            throw new ValidationError({
                message: tpl(messages.invalidLexical),
                property: 'lexical'
            });
        }
    }
};

module.exports = {
    async add(apiConfig, frame) {
        await validateAutomatedEmail(frame);
    },
    async edit(apiConfig, frame) {
        await validateAutomatedEmail(frame);
    },
    async bulkEdit(apiConfig, frame) {
        if (!frame.data.automated_emails || !Array.isArray(frame.data.automated_emails)) {
            throw new ValidationError({
                message: tpl(messages.bulkEditRequiresArray)
            });
        }

        for (const email of frame.data.automated_emails) {
            validateBulkEditEmail(email);
        }
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
