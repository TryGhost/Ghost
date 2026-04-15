// Filename must match the docName specified in ../../../automated-email-sequences.js
/* eslint-disable ghost/filenames/match-regex */

const {ValidationError} = require('@tryghost/errors');

const MAX_EMAILS = 10;
const MAX_DELAY_DAYS = 7;

const messages = {
    wrapperRequired: 'Request body must contain automated_email_sequences',
    emailsRequired: 'Emails array is required and must not be empty',
    tooManyEmails: `A sequence can contain at most ${MAX_EMAILS} emails`,
    delayDaysRequired: 'delay_days must be a non-negative integer',
    delayDaysTooHigh: `delay_days must not exceed ${MAX_DELAY_DAYS}`,
    delayDaysMustBePositiveAfterFirst: 'delay_days must be at least 1 for emails after the first',
    subjectRequired: 'Subject is required',
    lexicalRequired: 'Email content is required',
    invalidLexical: 'Lexical must be valid JSON',
    fieldMustBeString: (field) => `${field} must be a string`,
    fieldRequired: (field) => `${field} is required`,
    duplicateIds: 'Duplicate email IDs in request'
};

const REQUIRED_STRING_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to', 'email_design_setting_id'];

module.exports = {
    /**
     * @param {unknown} apiConfig
     * @param {{data: unknown}} frame
     */
    edit(apiConfig, frame) {
        const wrapper = frame.data?.automated_email_sequences;
        if (!Array.isArray(wrapper) || !wrapper[0] || typeof wrapper[0] !== 'object') {
            throw new ValidationError({message: messages.wrapperRequired});
        }

        const data = wrapper[0];

        if (!Array.isArray(data.emails) || data.emails.length === 0) {
            throw new ValidationError({message: messages.emailsRequired});
        }

        if (data.emails.length > MAX_EMAILS) {
            throw new ValidationError({message: messages.tooManyEmails});
        }

        const seenIds = new Set();

        for (let i = 0; i < data.emails.length; i++) {
            const email = data.emails[i];
            const isFirst = i === 0;

            // delay_days: required, non-negative integer, max MAX_DELAY_DAYS
            if (typeof email.delay_days !== 'number' || email.delay_days < 0 || !Number.isInteger(email.delay_days)) {
                throw new ValidationError({message: messages.delayDaysRequired, property: 'delay_days'});
            }
            if (email.delay_days > MAX_DELAY_DAYS) {
                throw new ValidationError({message: messages.delayDaysTooHigh, property: 'delay_days'});
            }
            if (!isFirst && email.delay_days === 0) {
                throw new ValidationError({message: messages.delayDaysMustBePositiveAfterFirst, property: 'delay_days'});
            }

            // subject: required, non-empty string
            if (typeof email.subject !== 'string' || !email.subject.trim()) {
                throw new ValidationError({message: messages.subjectRequired, property: 'subject'});
            }

            // lexical: required, valid JSON string
            if (typeof email.lexical !== 'string' || !email.lexical.trim()) {
                throw new ValidationError({message: messages.lexicalRequired, property: 'lexical'});
            }
            try {
                JSON.parse(email.lexical);
            } catch (e) {
                throw new ValidationError({message: messages.invalidLexical, property: 'lexical'});
            }

            // Required string fields: must be present and a non-null string
            for (const field of REQUIRED_STRING_FIELDS) {
                if (!(field in email)) {
                    throw new ValidationError({message: messages.fieldRequired(field), property: field});
                }
                if (typeof email[field] !== 'string') {
                    throw new ValidationError({message: messages.fieldMustBeString(field), property: field});
                }
            }

            // id: optional, but if present must be a string
            if (email.id !== undefined) {
                if (typeof email.id !== 'string') {
                    throw new ValidationError({message: messages.fieldMustBeString('id'), property: 'id'});
                }
                if (seenIds.has(email.id)) {
                    throw new ValidationError({message: messages.duplicateIds});
                }
                seenIds.add(email.id);
            }
        }
    }
};
