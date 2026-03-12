const ghostBookshelf = require('./base');
const logging = require('@tryghost/logging');
const urlUtils = require('../../shared/url-utils');
const lexicalLib = require('../lib/lexical');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../services/member-welcome-emails/constants');

const MEMBER_WELCOME_EMAIL_SLUG_SET = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

// Reverse mapping: slug → member status (e.g. 'member-welcome-email-free' → 'free')
const SLUG_TO_MEMBER_STATUS = Object.fromEntries(
    Object.entries(MEMBER_WELCOME_EMAIL_SLUGS).map(([status, slug]) => [slug, status])
);

const AutomatedEmail = ghostBookshelf.Model.extend({
    tableName: 'automated_emails',

    defaults() {
        return {
            status: 'inactive'
        };
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform URLs from __GHOST_URL__ to absolute
        if (attrs.lexical) {
            attrs.lexical = urlUtils.transformReadyToAbsolute(attrs.lexical);
        }

        return attrs;
    },

    // Alternative to Bookshelf's .format() that is only called when writing to db
    formatOnWrite(attrs) {
        // Ensure lexical URLs are stored as transform-ready with __GHOST_URL__ representing config.url
        if (attrs.lexical) {
            attrs.lexical = urlUtils.lexicalToTransformReady(attrs.lexical, {
                nodes: lexicalLib.nodes,
                transformMap: lexicalLib.urlTransformMap
            });
        }

        return attrs;
    },

    onSaved(model) {
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
                slug
            }
        }, isEnableTransition ? 'Welcome email enabled' : 'Welcome email disabled');

        if (isDisableTransition) {
            const memberStatus = SLUG_TO_MEMBER_STATUS[slug];
            if (memberStatus) {
                this.deletePendingOutboxEntries(memberStatus).catch((err) => {
                    logging.error({
                        system: {
                            event: 'welcome_email.cleanup_failed',
                            slug
                        },
                        err
                    }, 'Failed to clean up pending outbox entries after disabling welcome email');
                });
            }
        }
    },

    async deletePendingOutboxEntries(memberStatus) {
        const knex = ghostBookshelf.knex;
        const MemberCreatedEvent = require('../../shared/events/member-created-event');

        const deleted = await knex('outbox')
            .where('event_type', MemberCreatedEvent.name)
            .whereIn('status', ['pending', 'processing'])
            .whereRaw('JSON_EXTRACT(payload, ?) = ?', ['$.status', memberStatus])
            .delete();

        if (deleted > 0) {
            logging.info({
                system: {
                    event: 'welcome_email.outbox_cleanup',
                    member_status: memberStatus,
                    deleted_count: deleted
                }
            }, `Deleted ${deleted} pending outbox entries for "${memberStatus}" welcome email`);
        }
    }
});

module.exports = {
    AutomatedEmail: ghostBookshelf.model('AutomatedEmail', AutomatedEmail)
};
