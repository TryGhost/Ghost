// Filename must match the docName specified in ../../../drip-sequences.js
/* eslint-disable ghost/filenames/match-regex */

const {ValidationError} = require('@tryghost/errors');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../../../services/member-welcome-emails/constants');

const ALLOWED_AUTOMATION_SLUGS = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

const messages = {
    invalidAutomationSlug: `Automation slug must be one of: ${[...ALLOWED_AUTOMATION_SLUGS].join(', ')}`,
    missingDripSequencesPayload: 'Request must include a drip_sequences array with one sequence payload',
    emailsRequired: 'A non-empty emails array is required',
    emailMustBeObject: 'Each email must be an object',
    emailIdMustBeString: 'Email id must be a string',
    subjectRequired: 'Email subject is required',
    invalidLexical: 'Lexical must be a valid JSON string',
    delayDaysRequired: 'delay_days must be a non-negative integer'
};

/**
 * @param {string | undefined} automationSlug
 */
function validateAutomationSlug(automationSlug) {
    if (typeof automationSlug !== 'string' || !ALLOWED_AUTOMATION_SLUGS.has(automationSlug)) {
        throw new ValidationError({
            message: messages.invalidAutomationSlug,
            property: 'automation_slug'
        });
    }
}

/**
 * @param {unknown} lexical
 */
function validateLexical(lexical) {
    if (typeof lexical !== 'string') {
        throw new ValidationError({
            message: messages.invalidLexical,
            property: 'lexical'
        });
    }

    try {
        JSON.parse(lexical);
    } catch (err) {
        throw new ValidationError({
            message: messages.invalidLexical,
            property: 'lexical'
        });
    }
}

/**
 * @param {unknown} delayDays
 */
function validateDelayDays(delayDays) {
    if (!Number.isInteger(delayDays) || delayDays < 0) {
        throw new ValidationError({
            message: messages.delayDaysRequired,
            property: 'delay_days'
        });
    }
}

/**
 * @param {unknown[]} emails
 */
function validateEmailsPayload(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
        throw new ValidationError({
            message: messages.emailsRequired,
            property: 'emails'
        });
    }

    for (const email of emails) {
        if (!email || typeof email !== 'object') {
            throw new ValidationError({
                message: messages.emailMustBeObject,
                property: 'emails'
            });
        }

        if ('id' in email && typeof email.id !== 'string') {
            throw new ValidationError({
                message: messages.emailIdMustBeString,
                property: 'id'
            });
        }

        if (typeof email.subject !== 'string' || !email.subject.trim()) {
            throw new ValidationError({
                message: messages.subjectRequired,
                property: 'subject'
            });
        }

        validateLexical(email.lexical);
        validateDelayDays(email.delay_days);
    }
}

module.exports = {
    read(apiConfig, frame) {
        validateAutomationSlug(frame.data.automation_slug);
    },
    edit(apiConfig, frame) {
        validateAutomationSlug(frame.options.automation_slug);

        if (!Array.isArray(frame.data.drip_sequences) || !frame.data.drip_sequences[0]) {
            throw new ValidationError({
                message: messages.missingDripSequencesPayload,
                property: 'drip_sequences'
            });
        }

        const payload = frame.data.drip_sequences[0];
        validateEmailsPayload(payload.emails);
    }
};
