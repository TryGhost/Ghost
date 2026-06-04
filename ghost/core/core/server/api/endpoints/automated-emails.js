const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');
const automatedEmailActions = require('../../services/member-welcome-emails/automated-email-actions');

const messages = {
    automatedEmailNotFound: 'Automated email not found.'
};

// NOTE: This file is in a transitionary state. The old welcome-email-specific
// email table is kept for compatibility with existing installs, but new writes
// go through the generic automation action tables. This controller still
// exposes the original `automated_emails` API shape externally.
const AUTOMATION_FIELDS = ['status', 'name', 'slug'];
const EMAIL_FIELDS = ['subject', 'lexical', 'sender_name', 'sender_email', 'sender_reply_to', 'email_design_setting_id'];

function flattenAutomation(automation, email) {
    const result = {
        id: automation.id,
        status: automation.get('status'),
        name: automation.get('name'),
        slug: automation.get('slug'),
        subject: email.subject,
        lexical: email.lexical,
        sender_name: email.sender_name,
        sender_email: email.sender_email,
        sender_reply_to: email.sender_reply_to,
        email_design_setting_id: email.email_design_setting_id,
        created_at: email.created_at,
        updated_at: email.updated_at
    };
    return result;
}

async function flattenAutomations(automations, options = {}) {
    const emailMap = await automatedEmailActions.loadEmailMapForAutomations(automations, options);
    return automations
        .filter(automation => emailMap.has(automation.id))
        .map(automation => flattenAutomation(automation, emailMap.get(automation.id)));
}

async function loadFlattenedAutomation(data, options = {}) {
    const model = await models.Automation.findOne(data, options);
    const email = model ? await automatedEmailActions.loadEmailForAutomationId(model.id, options) : null;

    if (!model || !email) {
        throw new errors.NotFoundError({
            message: tpl(messages.automatedEmailNotFound)
        });
    }

    return flattenAutomation(model, email);
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
            const result = await models.Automation.findPage({
                ...frame.options
            });
            return {
                ...result,
                data: await flattenAutomations(result.data)
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
            return loadFlattenedAutomation(frame.data, {
                ...frame.options
            });
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
                const automation = await models.Automation.add(automationData, {...frame.options, transacting});
                const email = await automatedEmailActions.addEmailAction(automation, emailData, {...frame.options, transacting});
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
                let automation = await models.Automation.findOne({id: frame.options.id}, {
                    transacting
                });
                if (!automation) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.automatedEmailNotFound)
                    });
                }
                let email = await automatedEmailActions.loadEmailForAutomationId(automation.id, {transacting});

                if (!email) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.automatedEmailNotFound)
                    });
                }

                if (Object.keys(emailData).length > 0) {
                    email = await automatedEmailActions.editEmailAction(automation.id, emailData, {...frame.options, transacting});
                }

                if (Object.keys(automationData).length > 0) {
                    automation = await models.Automation.edit(automationData, {
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
            return {
                ...result,
                data: await flattenAutomations(result.data)
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
            return {
                ...result,
                data: await flattenAutomations(result.data)
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
