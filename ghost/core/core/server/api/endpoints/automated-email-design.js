const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../../services/member-welcome-emails/constants');

const messages = {
    defaultDesignNotFound: 'Default automated email design setting not found.',
    senderFieldsNotEditable: 'Sender fields cannot be modified through the email design endpoint.'
};

const EDITABLE_DESIGN_FIELDS = [
    'background_color',
    'header_background_color',
    'header_image',
    'show_header_icon',
    'show_header_title',
    'footer_content',
    'button_color',
    'button_corners',
    'button_style',
    'link_color',
    'link_style',
    'body_font_category',
    'title_font_category',
    'title_font_weight',
    'image_corners',
    'divider_color',
    'section_title_color',
    'show_badge'
];

const SENDER_FIELDS = [
    'sender_name',
    'sender_email',
    'sender_reply_to'
];

/**
 * @param {object} rawData
 */
function normalizeEditData(rawData) {
    // Reject slug changes — the slug is an immutable identifier
    if ('slug' in rawData) {
        throw new errors.ValidationError({
            message: 'The slug field cannot be modified.'
        });
    }

    if (SENDER_FIELDS.some(field => Object.hasOwn(rawData, field))) {
        throw new errors.ValidationError({
            message: tpl(messages.senderFieldsNotEditable)
        });
    }

    return Object.fromEntries(
        EDITABLE_DESIGN_FIELDS
            .filter(field => Object.hasOwn(rawData, field))
            .map(field => [field, rawData[field]])
    );
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
            const data = normalizeEditData(frame.data.automated_email_design[0]);

            const defaultDesign = await resolveDefaultDesign(frame.options);

            if (Object.keys(data).length === 0) {
                return defaultDesign;
            }

            return await models.EmailDesignSetting.edit(
                data,
                {...frame.options, id: defaultDesign.get('id')}
            );
        }
    }
};

module.exports = controller;
