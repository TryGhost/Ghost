const errors = require('@tryghost/errors');
const aiService = require('../../services/ai');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'ai',
    generateImageAltText: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'image_url'
        ],
        permissions: {
            docName: 'posts',
            method: 'edit'
        },
        // NOTE: this is a custom method (not browse/read/add/edit/...), so the
        // shared validation pipeline never calls into it - api-framework only
        // wires up `validation.data.*.required` checks for the standard CRUD
        // method names. Validate manually until custom methods get the same
        // support (see images.js `upload` for the same pattern).
        async validation(frame) {
            if (!frame.data.image_url) {
                throw new errors.ValidationError({
                    message: 'A valid Ghost image URL is required.'
                });
            }
        },
        async query(frame) {
            const altText = await aiService.generateImageAltText(frame.data.image_url);

            return {
                alt_text: altText
            };
        }
    }
};

module.exports = controller;
