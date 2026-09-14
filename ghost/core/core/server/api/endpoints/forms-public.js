const formsService = require('../../services/forms');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'forms',

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: false,
        query(frame) {
            return formsService.getPublicForm(frame.data, frame.options);
        }
    },

    addSubmission: {
        statusCode: 201,
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
        permissions: false,
        query(frame) {
            return formsService.submitPublicForm(frame);
        }
    },

    getEmbedScript: {
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
        permissions: false,
        query(frame) {
            frame.response = async function (req, res) {
                const script = await formsService.generateEmbedScript(frame.options.id);
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                return res.send(script);
            };
        }
    }
};

module.exports = controller;
