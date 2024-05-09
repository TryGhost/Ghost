const tpl = require('@tryghost/tpl');
const mailService = require('../../services/mail');
const api = require('./');
let mailer;
let _private = {};

const messages = {
    unableToSendEmail: 'Ghost is currently unable to send email.',
    seeLinkForInstructions: 'See {link} for instructions.',
    testGhostEmail: 'Test Ghost Email'
};

_private.sendMail = (object) => {
    if (!(mailer instanceof mailService.GhostMailer)) {
        mailer = new mailService.GhostMailer();
    }

    return mailer.send(object.mail[0].message).catch((err) => {
        if (mailer.state.usingDirect) {
            api.notifications.add(
                {
                    notifications: [{
                        type: 'warn',
                        message: [
                            tpl(messages.unableToSendEmail),
                            tpl(messages.seeLinkForInstructions, {link: 'https://ghost.org/docs/concepts/config/#mail'})
                        ].join(' ')
                    }]
                },
                {context: {internal: true}}
            );
        }

        return Promise.reject(err);
    });
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'mail',

    send: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query(frame) {
            return _private.sendMail(frame.data);
        }
    }
};

module.exports = controller;
