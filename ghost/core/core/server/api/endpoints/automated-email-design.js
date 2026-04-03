const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../../services/member-welcome-emails/constants');

const messages = {
    defaultDesignNotFound: 'Default automated email design setting not found.'
};

/**
 * Resolves the shared default email design setting row.
 *
 * @param {object} options - Bookshelf query options (e.g. transacting)
 * @returns {Promise<import('bookshelf').Model>} The default EmailDesignSetting model
 */
async function resolveDefaultDesign(options) {
    const model = await models.EmailDesignSetting.findOne(
        {slug: DEFAULT_EMAIL_DESIGN_SETTING_SLUG},
        options
    );

    if (!model) {
        const err = new errors.InternalServerError({
            message: tpl(messages.defaultDesignNotFound)
        });
        logging.error(err);
        throw err;
    }

    return model;
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automated_email_design',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'email_design_setting',
            method: 'read'
        },
        async query(frame) {
            return await resolveDefaultDesign(frame.options);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'email_design_setting',
            method: 'edit'
        },
        async query(frame) {
            const data = frame.data.automated_email_design[0];

            // Strip id from the payload — Bookshelf uses the options id
            // for the WHERE clause and a mismatched id causes "No Rows Updated"
            delete data.id;

            // Reject slug changes — the slug is an immutable identifier
            if ('slug' in data) {
                throw new errors.ValidationError({
                    message: 'The slug field cannot be modified.'
                });
            }

            const defaultDesign = await resolveDefaultDesign(frame.options);

            return await models.EmailDesignSetting.edit(
                data,
                {...frame.options, id: defaultDesign.get('id')}
            );
        }
    }
};

module.exports = controller;
