const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');

const messages = {
    automatedEmailNotFound: 'Automated email not found.',
    automationHasNoEmails: 'Automation has no emails.'
};

// NOTE: This file is in a transitionary state. The `automated_emails` database table was split into
// `welcome_email_automations` (automation metadata: status, name, slug) and
// `welcome_email_automated_emails` (email content: subject, lexical, sender fields). This controller
// acts as a facade that joins/splits data between those two models while preserving the original
// `automated_emails` API shape externally.
const AUTOMATION_FIELDS = ['status', 'name', 'slug'];
const EMAIL_FIELDS = ['subject', 'lexical', 'sender_name', 'sender_email', 'sender_reply_to', 'email_design_setting_id'];

/**
 * Returns the head of the linked list: the email not referenced as a "next" by any other email.
 * @param {object[]} emails
 */
function findFirstEmail(emails) {
    const nextIds = new Set(
        emails.map(e => e.get('next_welcome_email_automated_email_id')).filter(Boolean)
    );
    return emails.find(e => !nextIds.has(e.id));
}

function flattenAutomation(automation, email) {
    if (!email) {
        const emails = automation.related('welcomeEmailAutomatedEmails')?.models || [];
        email = findFirstEmail(emails) || emails[0];
    }
    return {
        id: automation.id,
        status: automation.get('status'),
        name: automation.get('name'),
        slug: automation.get('slug'),
        subject: email?.get('subject'),
        lexical: email?.get('lexical'),
        sender_name: email?.get('sender_name'),
        sender_email: email?.get('sender_email'),
        sender_reply_to: email?.get('sender_reply_to'),
        email_design_setting_id: email?.get('email_design_setting_id'),
        created_at: automation.get('created_at'),
        updated_at: automation.get('updated_at')
    };
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automated_emails',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        async query(frame) {
            const result = await models.WelcomeEmailAutomation.findPage({
                ...frame.options,
                withRelated: ['welcomeEmailAutomatedEmails']
            });
            return {
                ...result,
                data: result.data.map(automation => flattenAutomation(automation))
            };
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields'
        ],
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            const model = await models.WelcomeEmailAutomation.findOne(frame.data, {
                ...frame.options,
                withRelated: ['welcomeEmailAutomatedEmails']
            });
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.automatedEmailNotFound)
                });
            }

            const emails = model.related('welcomeEmailAutomatedEmails').models;
            if (emails.length === 0) {
                throw new errors.InternalServerError({
                    message: tpl(messages.automationHasNoEmails)
                });
            }
            if (emails.length > 1) {
                logging.warn(`[automated-emails] Multiple emails found for automation ${model.id}, using first`);
            }

            const firstEmail = findFirstEmail(emails) || emails[0];
            return flattenAutomation(model, firstEmail);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            const data = frame.data.automated_emails[0];

            const emailData = _.pick(data, EMAIL_FIELDS);
            const automationData = _.pick(data, AUTOMATION_FIELDS);

            return models.Base.transaction(async (transacting) => {
                const automation = await models.WelcomeEmailAutomation.add(automationData, {...frame.options, transacting});
                const email = await models.WelcomeEmailAutomatedEmail.add(
                    {
                        ...emailData,
                        welcome_email_automation_id: automation.id,
                        delay_days: 0
                    },
                    {...frame.options, transacting}
                );
                return flattenAutomation(automation, email);
            });
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        // eslint-disable-next-line ghost/ghost-custom/max-api-complexity
        async query(frame) {
            const data = frame.data.automated_emails[0];

            const emailData = _.pick(data, EMAIL_FIELDS);
            const automationData = _.pick(data, AUTOMATION_FIELDS);

            return models.Base.transaction(async (transacting) => {
                let automation = await models.WelcomeEmailAutomation.findOne({id: frame.options.id}, {
                    transacting,
                    withRelated: ['welcomeEmailAutomatedEmails']
                });
                if (!automation) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.automatedEmailNotFound)
                    });
                }

                const emails = automation.related('welcomeEmailAutomatedEmails').models;
                const firstEmail = findFirstEmail(emails) || emails[0];
                const otherEmails = emails.filter(e => e.id !== firstEmail?.id);

                // Edit the first email: apply field updates and null out its next reference
                let email = await models.WelcomeEmailAutomatedEmail.edit(
                    {...emailData, next_welcome_email_automated_email_id: null},
                    {...frame.options, transacting, id: firstEmail.id}
                );

                // Null out next references in other emails before deleting (avoids FK constraint failures)
                for (const otherEmail of otherEmails) {
                    if (otherEmail.get('next_welcome_email_automated_email_id')) {
                        await models.WelcomeEmailAutomatedEmail.edit(
                            {next_welcome_email_automated_email_id: null},
                            {transacting, id: otherEmail.id}
                        );
                    }
                }

                for (const otherEmail of otherEmails) {
                    await models.WelcomeEmailAutomatedEmail.destroy({id: otherEmail.id, transacting});
                }

                if (Object.keys(automationData).length > 0) {
                    automation = await models.WelcomeEmailAutomation.edit(automationData, {
                        ...frame.options,
                        transacting
                    });
                }

                return flattenAutomation(automation, email);
            });
        }
    },

    editSenders: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            memberWelcomeEmailService.init();
            const data = frame.data;
            const result = await memberWelcomeEmailService.api.editSharedSenderOptions({
                sender_name: data.sender_name,
                sender_email: data.sender_email,
                sender_reply_to: data.sender_reply_to
            });
            const automations = await Promise.all(
                result.data.map(a => models.WelcomeEmailAutomation.findOne(
                    {id: a.id},
                    {withRelated: ['welcomeEmailAutomatedEmails']}
                ))
            );
            return {
                ...result,
                data: automations.map(automation => flattenAutomation(automation))
            };
        }
    },

    verifySenderUpdate: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'edit'
        },
        data: [
            'token'
        ],
        async query(frame) {
            memberWelcomeEmailService.init();
            const result = await memberWelcomeEmailService.api.verifySenderPropertyUpdate(frame.data.token);
            const automations = await Promise.all(
                result.data.map(a => models.WelcomeEmailAutomation.findOne(
                    {id: a.id},
                    {withRelated: ['welcomeEmailAutomatedEmails']}
                ))
            );
            return {
                ...result,
                data: automations.map(automation => flattenAutomation(automation))
            };
        }
    },
    preview: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        data: [
            'subject',
            'lexical'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            memberWelcomeEmailService.init();
            return await memberWelcomeEmailService.api.previewEmail({
                subject: frame.data.subject,
                lexical: frame.data.lexical,
                automatedEmailId: frame.options.id
            });
        }
    },
    sendTestEmail: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        data: [
            'email',
            'subject',
            'lexical'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            memberWelcomeEmailService.init();
            await memberWelcomeEmailService.api.sendTestEmail({
                email: frame.data.email,
                subject: frame.data.subject,
                lexical: frame.data.lexical,
                automatedEmailId: frame.options.id
            });
        }
    }
};

module.exports = controller;
