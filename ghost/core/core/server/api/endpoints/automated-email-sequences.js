const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const messages = {
    automationNotFound: 'Automation not found.',
    emailNotInAutomation: 'One or more email IDs do not belong to this automation.'
};

const EMAIL_FIELDS = ['delay_days', 'subject', 'lexical', 'sender_name', 'sender_email', 'sender_reply_to', 'email_design_setting_id'];

/**
 * Walk the linked list of emails and return them in order.
 *
 * @param {import('bookshelf').Collection} emailsCollection
 * @returns {import('bookshelf').Model[]}
 */
function orderEmailsByLinkedList(emailsCollection) {
    const emails = emailsCollection.models;
    if (emails.length === 0) {
        return [];
    }

    // Build a map from id -> model, and find all "next" pointers
    const byId = new Map(emails.map(e => [e.id, e]));
    const referencedAsNext = new Set(
        emails
            .map(e => e.get('next_welcome_email_automated_email_id'))
            .filter(Boolean)
    );

    // The head is the email whose id is NOT referenced as anyone's "next"
    let head = null;
    for (const email of emails) {
        if (!referencedAsNext.has(email.id)) {
            head = email;
            break;
        }
    }

    // If no head found (circular?), fall back to first email
    if (!head) {
        head = emails[0];
    }

    const ordered = [];
    let current = head;
    const visited = new Set();
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        ordered.push(current);
        const nextId = current.get('next_welcome_email_automated_email_id');
        current = nextId ? byId.get(nextId) : null;
    }

    return ordered;
}

/**
 * Format an ordered array of email models into the API response shape.
 */
function formatSequenceResponse(automationId, orderedEmails) {
    return {
        id: automationId,
        emails: orderedEmails.map(email => ({
            id: email.id,
            delay_days: email.get('delay_days'),
            subject: email.get('subject'),
            lexical: email.get('lexical'),
            sender_name: email.get('sender_name'),
            sender_email: email.get('sender_email'),
            sender_reply_to: email.get('sender_reply_to'),
            email_design_setting_id: email.get('email_design_setting_id')
        }))
    };
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automated_email_sequences',

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [],
        data: ['id'],
        permissions: {
            docName: 'automated_emails',
            method: 'browse'
        },
        async query(frame) {
            const automation = await models.WelcomeEmailAutomation.findOne(
                {id: frame.data.id},
                {withRelated: ['welcomeEmailAutomatedEmails']}
            );

            if (!automation) {
                throw new errors.NotFoundError({
                    message: tpl(messages.automationNotFound)
                });
            }

            const ordered = orderEmailsByLinkedList(automation.related('welcomeEmailAutomatedEmails'));
            return formatSequenceResponse(automation.id, ordered);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: ['id'],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automated_emails',
            method: 'edit'
        },
        // eslint-disable-next-line ghost/ghost-custom/max-api-complexity
        async query(frame) {
            const db = require('../../data/db');
            const requestEmails = frame.data.automated_email_sequences[0].emails;

            return models.Base.transaction(async (transacting) => {
                // A. Load current state
                const automation = await models.WelcomeEmailAutomation.findOne(
                    {id: frame.options.id},
                    {transacting, withRelated: ['welcomeEmailAutomatedEmails']}
                );

                if (!automation) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.automationNotFound)
                    });
                }

                const existingEmails = automation.related('welcomeEmailAutomatedEmails');
                const existingById = new Map(existingEmails.models.map(e => [e.id, e]));

                // B. Compute diff
                const toUpdate = [];
                const toCreate = [];
                const requestIdSet = new Set();

                for (const reqEmail of requestEmails) {
                    if (reqEmail.id) {
                        if (!existingById.has(reqEmail.id)) {
                            throw new errors.ValidationError({
                                message: tpl(messages.emailNotInAutomation)
                            });
                        }
                        requestIdSet.add(reqEmail.id);
                        toUpdate.push(reqEmail);
                    } else {
                        toCreate.push(reqEmail);
                    }
                }

                const toDeleteIds = [];
                for (const existing of existingEmails.models) {
                    if (!requestIdSet.has(existing.id)) {
                        toDeleteIds.push(existing.id);
                    }
                }

                // Build old ordered list for run reconciliation
                const oldOrdered = orderEmailsByLinkedList(existingEmails);

                // C. Create new emails (with null next pointer for now)
                const createdIdsByIndex = new Map();
                let requestIndex = 0;
                for (const reqEmail of requestEmails) {
                    if (!reqEmail.id) {
                        const emailData = {};
                        for (const field of EMAIL_FIELDS) {
                            if (field in reqEmail) {
                                emailData[field] = reqEmail[field];
                            }
                        }
                        const created = await models.WelcomeEmailAutomatedEmail.add(
                            {
                                ...emailData,
                                welcome_email_automation_id: automation.id,
                                next_welcome_email_automated_email_id: null
                            },
                            {transacting}
                        );
                        createdIdsByIndex.set(requestIndex, created.id);
                    }
                    requestIndex++;
                }

                // D. Update existing emails
                for (const reqEmail of toUpdate) {
                    const emailData = {};
                    for (const field of EMAIL_FIELDS) {
                        if (field in reqEmail) {
                            emailData[field] = reqEmail[field];
                        }
                    }
                    await models.WelcomeEmailAutomatedEmail.edit(
                        {...emailData, next_welcome_email_automated_email_id: null},
                        {id: reqEmail.id, transacting}
                    );
                }

                // E. Set linked-list pointers
                // Build the final ordered ID list
                const finalOrderedIds = requestEmails.map((reqEmail, idx) => {
                    return reqEmail.id || createdIdsByIndex.get(idx);
                });

                for (let i = 0; i < finalOrderedIds.length; i++) {
                    const nextId = i + 1 < finalOrderedIds.length ? finalOrderedIds[i + 1] : null;
                    await models.WelcomeEmailAutomatedEmail.edit(
                        {next_welcome_email_automated_email_id: nextId},
                        {id: finalOrderedIds[i], transacting}
                    );
                }

                // F. Reconcile runs
                if (toDeleteIds.length > 0) {
                    const toDeleteSet = new Set(toDeleteIds);
                    const finalOrderedIdSet = new Set(finalOrderedIds);

                    // For each deleted email, find replacement: scan forward in old order
                    // to find first surviving email
                    const remapping = new Map();
                    for (let i = 0; i < oldOrdered.length; i++) {
                        const emailId = oldOrdered[i].id;
                        if (!toDeleteSet.has(emailId)) {
                            continue;
                        }
                        // Scan forward from position i+1
                        let replacement = null;
                        for (let j = i + 1; j < oldOrdered.length; j++) {
                            if (finalOrderedIdSet.has(oldOrdered[j].id)) {
                                replacement = oldOrdered[j];
                                break;
                            }
                        }
                        remapping.set(emailId, replacement);
                    }

                    // Apply remapping to runs
                    for (const [deletedId, replacement] of remapping) {
                        if (replacement) {
                            const newDelayDays = requestEmails.find(
                                (e, idx) => (e.id || createdIdsByIndex.get(idx)) === replacement.id
                            )?.delay_days ?? replacement.get('delay_days');

                            // Fetch affected runs to calculate ready_at in JS (cross-DB compatible)
                            const affectedRuns = await db.knex('welcome_email_automation_runs')
                                .where('next_welcome_email_automated_email_id', deletedId)
                                .whereNull('exit_reason')
                                .select('id', 'created_at')
                                .transacting(transacting);

                            for (const run of affectedRuns) {
                                const readyAt = new Date(new Date(run.created_at).getTime() + newDelayDays * 86400000);
                                await db.knex('welcome_email_automation_runs')
                                    .where('id', run.id)
                                    .update({
                                        next_welcome_email_automated_email_id: replacement.id,
                                        ready_at: readyAt,
                                        step_started_at: null,
                                        step_attempts: 0,
                                        updated_at: new Date()
                                    })
                                    .transacting(transacting);
                            }
                        } else {
                            await db.knex('welcome_email_automation_runs')
                                .where('next_welcome_email_automated_email_id', deletedId)
                                .whereNull('exit_reason')
                                .update({
                                    next_welcome_email_automated_email_id: null,
                                    ready_at: null,
                                    step_started_at: null,
                                    step_attempts: 0,
                                    exit_reason: 'finished',
                                    updated_at: new Date()
                                })
                                .transacting(transacting);
                        }
                    }
                }

                // G. Delete removed emails
                for (const deleteId of toDeleteIds) {
                    await models.WelcomeEmailAutomatedEmail.destroy({id: deleteId, transacting});
                }

                // H. Return the new sequence
                const updatedAutomation = await models.WelcomeEmailAutomation.findOne(
                    {id: frame.options.id},
                    {transacting, withRelated: ['welcomeEmailAutomatedEmails']}
                );
                const ordered = orderEmailsByLinkedList(updatedAutomation.related('welcomeEmailAutomatedEmails'));
                return formatSequenceResponse(automation.id, ordered);
            });
        }
    }
};

module.exports = controller;
