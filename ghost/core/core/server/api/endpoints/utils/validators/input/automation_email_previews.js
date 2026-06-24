// Filename must match the docName specified in ../../../automation-email-previews.js
/* eslint-disable local-filenames/match-regex */

const validator = require('@tryghost/validator');
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const lexicalLib = require('../../../../../lib/lexical');

const messages = {
    invalidEmailReceived: 'The server did not receive a valid email',
    invalidLexical: 'Lexical must be a well-formed Lexical document',
    subjectRequired: 'Subject is required',
    lexicalRequired: 'Email content is required'
};

const validatePreviewData = async (frame) => {
    const subject = frame.data.subject;
    const lexical = frame.data.lexical;

    if (typeof subject !== 'string' || !subject.trim()) {
        throw new ValidationError({
            message: tpl(messages.subjectRequired),
            property: 'subject'
        });
    }

    if (typeof lexical !== 'string' || !lexical.trim()) {
        throw new ValidationError({
            message: tpl(messages.lexicalRequired),
            property: 'lexical'
        });
    }

    if (!await lexicalLib.validate(lexical)) {
        throw new ValidationError({
            message: tpl(messages.invalidLexical),
            property: 'lexical'
        });
    }
};

module.exports = {
    async preview(apiConfig, frame) {
        await validatePreviewData(frame);
    },

    async sendTestEmail(apiConfig, frame) {
        const email = frame.data.email;

        if (typeof email !== 'string' || !validator.isEmail(email)) {
            throw new ValidationError({
                message: tpl(messages.invalidEmailReceived),
                property: 'email'
            });
        }

        await validatePreviewData(frame);
    }
};
