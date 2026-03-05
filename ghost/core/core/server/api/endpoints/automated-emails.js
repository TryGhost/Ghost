const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const db = require('../../data/db');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');

const messages = {
    automatedEmailNotFound: 'Automated email not found.'
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
            return models.AutomatedEmail.add(data, frame.options);
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
        async query(frame) {
            // Delete recipient records first to avoid FK constraint violation
            await db.knex('automated_email_recipients')
                .where('automated_email_id', frame.options.id)
                .del();

            return models.AutomatedEmail.destroy({...frame.options, require: true});
        }
    },

    browseActivity: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'page',
            'campaign_type'
        ],
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            const limit = frame.options.limit || 50;
            const page = frame.options.page || 1;
            const offset = (page - 1) * limit;

            let query = db.knex('automated_email_recipients as r')
                .join('automated_emails as e', 'r.automated_email_id', 'e.id')
                .leftJoin('campaign_enrollments as ce', 'r.enrollment_id', 'ce.id')
                .select(
                    'r.id',
                    'r.member_email',
                    'r.member_name',
                    'r.step_order',
                    'r.created_at as sent_at',
                    'e.name as step_name',
                    'e.subject',
                    'e.campaign_type',
                    'ce.status as enrollment_status'
                )
                .orderBy('r.created_at', 'desc');

            if (frame.options.campaign_type) {
                query = query.where('e.campaign_type', frame.options.campaign_type);
            }

            const countQuery = db.knex('automated_email_recipients as r')
                .join('automated_emails as e', 'r.automated_email_id', 'e.id');

            if (frame.options.campaign_type) {
                countQuery.where('e.campaign_type', frame.options.campaign_type);
            }

            const [{count}] = await countQuery.count('r.id as count');

            const rows = await query.limit(limit).offset(offset);

            return {
                activity: rows,
                meta: {
                    pagination: {
                        page,
                        limit,
                        pages: Math.ceil(count / limit),
                        total: count
                    }
                }
            };
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
