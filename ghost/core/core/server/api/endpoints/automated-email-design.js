const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../../services/member-welcome-emails/constants');

const messages = {
    defaultDesignNotFound: 'Default automated email design setting not found.'
};

const SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];

function extractSenderAttrs(data) {
    const attrs = {};
    for (const field of SENDER_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            attrs[field] = data[field];
            delete data[field];
        }
    }
    return attrs;
}

function rejectImmutableFields(data) {
    if ('slug' in data) {
        throw new errors.ValidationError({
            message: 'The slug field cannot be modified.'
        });
    }
}

function buildEditResult(editedDesign, sender, meta) {
    const result = {data: [{...editedDesign.toJSON(), ...sender}]};
    const hasMeta = meta && Object.keys(meta).length > 0;
    if (hasMeta) {
        result.meta = meta;
    }
    return result;
}

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
            const defaultDesign = await resolveDefaultDesign(frame.options);

            memberWelcomeEmailService.init();
            const sender = await memberWelcomeEmailService.api.getResolvedDesignSender({
                emailDesignSettingId: defaultDesign.get('id')
            });

            return {...defaultDesign.toJSON(), ...sender};
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

            rejectImmutableFields(data);

            // Sender fields need verification-aware writes, so route them through the welcome email service.
            const senderAttrs = extractSenderAttrs(data);

            const defaultDesign = await resolveDefaultDesign(frame.options);
            const emailDesignSettingId = defaultDesign.get('id');

            const editedDesign = Object.keys(data).length > 0 ?
                await models.EmailDesignSetting.edit(
                    data,
                    {...frame.options, id: emailDesignSettingId}
                ) :
                defaultDesign;

            memberWelcomeEmailService.init();
            const {meta} = await memberWelcomeEmailService.api.editDesignSenderOptions({
                emailDesignSettingId,
                attrs: senderAttrs
            });
            const sender = await memberWelcomeEmailService.api.getResolvedDesignSender({
                emailDesignSettingId
            });
            const currentDesign = await models.EmailDesignSetting.findOne({id: emailDesignSettingId}, frame.options);

            return buildEditResult(currentDesign || editedDesign, sender, meta);
        }
    }
};

module.exports = controller;
