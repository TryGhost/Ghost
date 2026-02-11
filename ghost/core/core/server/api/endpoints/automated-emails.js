const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../services/member-welcome-emails/constants');

const MEMBER_WELCOME_EMAIL_SLUG_SET = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

const messages = {
    automatedEmailNotFound: 'Automated email not found.'
};

const logWelcomeEmailStatusChange = (model) => {
    if (!model?.id) {
        return;
    }

    const slug = model.get('slug');

    if (!MEMBER_WELCOME_EMAIL_SLUG_SET.has(slug)) {
        return;
    }

    const previousStatus = model.previous('status');
    const currentStatus = model.get('status');
    const isNewModel = previousStatus === undefined;
    const isEnableTransition = currentStatus === 'active' && (isNewModel || previousStatus === 'inactive');
    const isDisableTransition = previousStatus === 'active' && currentStatus === 'inactive';

    if (!isEnableTransition && !isDisableTransition) {
        return;
    }

    logging.info({
        system: {
            event: isEnableTransition ? 'welcome_email.enabled' : 'welcome_email.disabled',
            automated_email_id: model.id,
            slug,
            enabled: currentStatus === 'active'
        }
    }, isEnableTransition ? 'Welcome email enabled' : 'Welcome email disabled');
};

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
        query(frame) {
            return models.AutomatedEmail.findPage(frame.options);
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
            const model = await models.AutomatedEmail.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.automatedEmailNotFound)
                });
            }

            return model;
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
            const model = await models.AutomatedEmail.add(data, frame.options);
            logWelcomeEmailStatusChange(model);
            return model;
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
        async query(frame) {
            const data = frame.data.automated_emails[0];
            const model = await models.AutomatedEmail.edit(data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.automatedEmailNotFound)
                });
            }

            logWelcomeEmailStatusChange(model);

            return model;
        }
    },

    destroy: {
        statusCode: 204,
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
        query(frame) {
            return models.AutomatedEmail.destroy({...frame.options, require: true});
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
