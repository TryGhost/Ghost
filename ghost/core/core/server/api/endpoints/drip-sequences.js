const _ = require('lodash');
const errors = require('@tryghost/errors');
const models = require('../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../services/member-welcome-emails/constants');
const {orderSequenceEmails} = require('./utils/drip-sequences');

const ALLOWED_AUTOMATION_SLUGS = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

const AUTOMATION_NAMES = {
    [MEMBER_WELCOME_EMAIL_SLUGS.free]: 'Welcome Email (Free)',
    [MEMBER_WELCOME_EMAIL_SLUGS.paid]: 'Welcome Email (Paid)'
};

/**
 * @param {string} automationSlug
 */
function assertAllowedSlug(automationSlug) {
    if (!ALLOWED_AUTOMATION_SLUGS.has(automationSlug)) {
        throw new errors.ValidationError({
            message: 'Invalid automation slug',
            property: 'automation_slug'
        });
    }
}

/**
 * @param {import('bookshelf').Model} email
 */
function serializeEmail(email) {
    return {
        id: email.id,
        subject: email.get('subject'),
        lexical: email.get('lexical'),
        delay_days: email.get('delay_days'),
        next_welcome_email_automated_email_id: email.get('next_welcome_email_automated_email_id'),
        created_at: email.get('created_at'),
        updated_at: email.get('updated_at')
    };
}

/**
 * @param {import('bookshelf').Model | null | undefined} automation
 * @param {string} automationSlug
 */
function serializeSequence(automation, automationSlug) {
    const emails = automation ? orderSequenceEmails(automation.related('welcomeEmailAutomatedEmails').models) : [];

    return {
        automation_id: automation?.id || null,
        automation_slug: automationSlug,
        emails: emails.map(serializeEmail)
    };
}

/**
 * @param {string} automationSlug
 * @param {object} options
 */
async function findAutomationBySlug(automationSlug, options) {
    return await models.WelcomeEmailAutomation.findOne(
        {slug: automationSlug},
        {
            ...options,
            withRelated: ['welcomeEmailAutomatedEmails']
        }
    );
}

/**
 * @param {string} automationSlug
 * @param {object} options
 */
async function findOrCreateAutomation(automationSlug, options) {
    const existing = await findAutomationBySlug(automationSlug, options);
    if (existing) {
        return existing;
    }

    const created = await models.WelcomeEmailAutomation.add({
        slug: automationSlug,
        name: AUTOMATION_NAMES[automationSlug],
        status: 'inactive'
    }, options);

    return await findAutomationBySlug(automationSlug, options) || created;
}

/**
 * @param {import('bookshelf').Model} automation
 * @param {{id?: string; subject: string; lexical: string; delay_days: number}[]} emailsPayload
 * @param {object} options
 */
async function saveAutomationEmails(automation, emailsPayload, options) {
    const existingEmails = automation.related('welcomeEmailAutomatedEmails').models;
    const existingById = new Map(existingEmails.map(email => [email.id, email]));
    const nextOrderedEmails = [];

    for (const payload of emailsPayload) {
        const attributes = _.pick(payload, ['subject', 'lexical', 'delay_days']);
        const existingEmail = payload.id ? existingById.get(payload.id) : null;

        if (payload.id && !existingEmail) {
            throw new errors.ValidationError({
                message: `Email id ${payload.id} does not belong to ${automation.get('slug')}`,
                property: 'id'
            });
        }

        if (existingEmail) {
            const updatedEmail = await models.WelcomeEmailAutomatedEmail.edit(attributes, {
                ...options,
                id: existingEmail.id
            });
            nextOrderedEmails.push(updatedEmail);
            existingById.delete(existingEmail.id);
            continue;
        }

        const createdEmail = await models.WelcomeEmailAutomatedEmail.add({
            ...attributes,
            welcome_email_automation_id: automation.id,
            next_welcome_email_automated_email_id: null
        }, options);
        nextOrderedEmails.push(createdEmail);
    }

    for (let i = 0; i < nextOrderedEmails.length; i += 1) {
        const current = nextOrderedEmails[i];
        const next = nextOrderedEmails[i + 1];
        await models.WelcomeEmailAutomatedEmail.edit({
            next_welcome_email_automated_email_id: next?.id || null
        }, {
            ...options,
            id: current.id
        });
    }

    for (const orphanedEmail of existingById.values()) {
        await models.WelcomeEmailAutomatedEmail.destroy({
            ...options,
            id: orphanedEmail.id
        });
    }
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'drip_sequences',

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'automation_slug'
        ],
        validation: {
            data: {
                automation_slug: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automated_emails',
            method: 'read'
        },
        async query(frame) {
            const automationSlug = frame.data.automation_slug;
            assertAllowedSlug(automationSlug);

            const automation = await findAutomationBySlug(automationSlug, {});
            return serializeSequence(automation, automationSlug);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'automation_slug'
        ],
        validation: {
            options: {
                automation_slug: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automated_emails',
            method: 'edit'
        },
        async query(frame) {
            const automationSlug = frame.options.automation_slug;
            assertAllowedSlug(automationSlug);

            const data = frame.data.drip_sequences[0];
            const emailsPayload = data.emails || [];

            return models.Base.transaction(async (transacting) => {
                const transactionOptions = {transacting};
                const automation = await findOrCreateAutomation(automationSlug, transactionOptions);

                await saveAutomationEmails(automation, emailsPayload, transactionOptions);

                const updatedAutomation = await findAutomationBySlug(automationSlug, transactionOptions);
                return serializeSequence(updatedAutomation, automationSlug);
            });
        }
    }
};

module.exports = controller;
