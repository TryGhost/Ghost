const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const mega = require('../../services/mega');
const emailService = require('../../services/email-service');
const labs = require('../../../shared/labs');
const messages = {
    postNotFound: 'Post not found.'
};

const emailPreview = new mega.EmailPreview();

module.exports = {
    docName: 'email_previews',

    read: {
        options: [
            'fields',
            'memberSegment',
            'newsletter'
        ],
        validation: {
            options: {
                fields: ['html', 'plaintext', 'subject']
            }
        },
        data: [
            'id',
            'status'
        ],
        permissions: true,
        async query(frame) {
            if (labs.isSet('emailStability')) {
                return await emailService.controller.previewEmail(frame);
            }

            const options = Object.assign(frame.options, {formats: 'html,plaintext', withRelated: ['authors', 'posts_meta']});
            const data = Object.assign(frame.data, {status: 'all'});

            const model = await models.Post.findOne(data, options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.postNotFound)
                });
            }

            return emailPreview.generateEmailContent(model, {
                newsletter: frame.options.newsletter,
                memberSegment: frame.options.memberSegment
            });
        }
    },
    sendTestEmail: {
        statusCode: 204,
        headers: {},
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
            if (labs.isSet('emailStability')) {
                return await emailService.controller.sendTestEmail(frame);
            }

            const options = Object.assign(frame.options, {status: 'all'});
            let model = await models.Post.findOne(options, {withRelated: ['authors']});

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.postNotFound)
                });
            }
            const {emails = [], memberSegment, newsletter = ''} = frame.data;
            return await mega.mega.sendTestEmail(model, emails, memberSegment, newsletter);
        }
    }
};
