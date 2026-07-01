const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');
const emailAddressService = require('../../services/email-address');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../../services/member-welcome-emails/constants');
const {validateEmailSenderFields} = require('./utils/validate-email-sender-fields');

const messages = {
    automatedEmailNotFound: 'Automated email not found.'
};

// NOTE: This file is in a transitionary state. The `automated_emails` database table was split into
// `automations` (automation metadata: status, name, slug) and
// `welcome_email_automated_emails` (email content: subject, lexical). This controller
// acts as a facade that joins/splits data between those two models while preserving the original
// `automated_emails` API shape externally.
const AUTOMATION_FIELDS = ['status', 'name', 'slug'];
const EMAIL_FIELDS = ['subject', 'lexical', 'email_design_setting_id'];
const SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];

function flattenAutomation(automation, email = automation.related('welcomeEmailAutomatedEmail'), designSettings = email?.related('emailDesignSetting')) {
    const result = {
        id: automation.id,
        status: automation.get('status'),
        name: automation.get('name'),
        slug: automation.get('slug'),
        subject: email?.get('subject') || null,
        lexical: email?.get('lexical') || null,
        sender_name: designSettings?.get('sender_name') || null,
        sender_email: designSettings?.get('sender_email') || null,
        sender_reply_to: designSettings?.get('sender_reply_to') || null,
        email_design_setting_id: email?.get('email_design_setting_id') || designSettings?.id || null,
        created_at: automation.get('created_at'),
        updated_at: automation.get('updated_at')
    };
    return result;
}

async function getDefaultEmailDesignSettings(options = {}) {
    const designSettings = await models.EmailDesignSetting.findOne({slug: DEFAULT_EMAIL_DESIGN_SETTING_SLUG}, options);

    if (!designSettings?.id) {
        throw new errors.NotFoundError({
            message: 'Default automated email design setting not found'
        });
    }

    return designSettings;
}

function flattenAutomationWithDefaultSenderSettings(automation, defaultDesignSettings) {
    const email = automation.related('welcomeEmailAutomatedEmail');
    const designSettings = email?.related('emailDesignSetting')?.id ?
        email.related('emailDesignSetting') :
        defaultDesignSettings;

    return flattenAutomation(automation, email, designSettings);
}

async function updateEmailDesignSenderFields(email, senderData, options) {
    const id = email.get('email_design_setting_id');

    if (Object.keys(senderData).length > 0) {
        return models.EmailDesignSetting.edit(senderData, {
            ...options,
            id
        });
    }

    return models.EmailDesignSetting.findOne({id}, options);
}

function getChangedSenderData(senderData, designSettings) {
    return _.pickBy(senderData, (value, field) => value !== designSettings?.get(field));
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
                ...frame.options,
                withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
            });
            const defaultDesignSettings = await getDefaultEmailDesignSettings();
            return {
                ...result,
                data: result.data.map(automation => flattenAutomationWithDefaultSenderSettings(automation, defaultDesignSettings))
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
            const model = await models.Automation.findOne(frame.data, {
                ...frame.options,
                withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
            });
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.automatedEmailNotFound)
                });
            }

            const defaultDesignSettings = await getDefaultEmailDesignSettings();
            return flattenAutomationWithDefaultSenderSettings(model, defaultDesignSettings);
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
            const senderData = _.pick(data, SENDER_FIELDS);
            const automationData = _.pick(data, AUTOMATION_FIELDS);
            emailAddressService.init();
            validateEmailSenderFields(emailAddressService.service, senderData);

            return models.Base.transaction(async (transacting) => {
                const automation = await models.Automation.add(automationData, {...frame.options, transacting});
                const email = await models.WelcomeEmailAutomatedEmail.add(
                    {
                        ...emailData,
                        welcome_email_automation_id: automation.id,
                        delay_days: 0
                    },
                    {...frame.options, transacting}
                );
                const designSettings = await updateEmailDesignSenderFields(email, senderData, {...frame.options, transacting});
                return flattenAutomation(automation, email, designSettings);
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
            const senderData = _.pick(data, SENDER_FIELDS);
            const automationData = _.pick(data, AUTOMATION_FIELDS);

            return models.Base.transaction(async (transacting) => {
                let automation = await models.Automation.findOne({id: frame.options.id}, {
                    transacting,
                    withRelated: ['welcomeEmailAutomatedEmail', 'welcomeEmailAutomatedEmail.emailDesignSetting']
                });
                if (!automation) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.automatedEmailNotFound)
                    });
                }
                let email = automation.related('welcomeEmailAutomatedEmail');
                const hasEmailContent = Boolean(email.id);
                const designSettings = hasEmailContent ? email.related('emailDesignSetting') : null;
                const changedSenderData = hasEmailContent ? getChangedSenderData(senderData, designSettings) : {};

                emailAddressService.init();
                validateEmailSenderFields(emailAddressService.service, changedSenderData);

                if (hasEmailContent && Object.keys(emailData).length > 0) {
                    email = await models.WelcomeEmailAutomatedEmail.edit(emailData, {
                        ...frame.options,
                        transacting,
                        id: email.id
                    });
                }

                let updatedDesignSettings = designSettings;

                if (hasEmailContent) {
                    updatedDesignSettings = await updateEmailDesignSenderFields(
                        email,
                        changedSenderData,
                        {...frame.options, transacting}
                    );
                }

                if (Object.keys(automationData).length > 0) {
                    automation = await models.Automation.edit(automationData, {
                        ...frame.options,
                        transacting
                    });
                }

                if (!hasEmailContent) {
                    updatedDesignSettings = await getDefaultEmailDesignSettings({...frame.options, transacting});
                }

                return flattenAutomation(automation, email, updatedDesignSettings);
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
            const defaultDesignSettings = await getDefaultEmailDesignSettings();
            return {
                ...result,
                data: result.data.map(automation => flattenAutomationWithDefaultSenderSettings(automation, defaultDesignSettings))
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
            const defaultDesignSettings = await getDefaultEmailDesignSettings();
            return {
                ...result,
                data: result.data.map(automation => flattenAutomationWithDefaultSenderSettings(automation, defaultDesignSettings))
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
