// Filename must match the docName specified in ../../../automated-emails.js
/* eslint-disable ghost/filenames/match-regex */

const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidStatus: 'Status must be one of: inactive, active',
    invalidLexical: 'Lexical must be a valid JSON string',
    invalidName: 'Name must be "member-welcome-email"'
};

const ALLOWED_STATUSES = ['inactive', 'active'];
const ALLOWED_NAMES = ['member-welcome-email'];

const validateAutomatedEmail = async function (frame, options = {}) {
    if (!frame.data.automated_emails || !frame.data.automated_emails[0]) {
        return Promise.resolve();
    }

    const data = frame.data.automated_emails[0];

    // Validate status
    if (data.status && !ALLOWED_STATUSES.includes(data.status)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidStatus),
            property: 'status'
        }));
    }

    // Validate name - required for add, optional for edit
    if (options.requireName) {
        if (!data.name || !ALLOWED_NAMES.includes(data.name)) {
            return Promise.reject(new ValidationError({
                message: tpl(messages.invalidName),
                property: 'name'
            }));
        }
    } else if (data.name && !ALLOWED_NAMES.includes(data.name)) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.invalidName),
            property: 'name'
        }));
    }

    // Validate lexical is valid JSON
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
        await validateAutomatedEmail(frame, {requireName: true});
    },
    async edit(apiConfig, frame) {
        await validateAutomatedEmail(frame, {requireName: false});
    }
};
