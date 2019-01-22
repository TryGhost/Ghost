const Promise = require('bluebird');
const common = require('../../lib/common');
const mailService = require('../../services/mail');
const api = require('./');
let mailer;
let _private = {};

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
                            common.i18n.t('warnings.index.unableToSendEmail'),
                            common.i18n.t('common.seeLinkForInstructions', {link: 'https://docs.ghost.org/mail/'})
                        ].join(' ')
                    }]
                },
                {context: {internal: true}}
            );
        }

        return Promise.reject(err);
    });
};

module.exports = {
    docName: 'mail',

    send: {
        permissions: true,
        query(frame) {
            return _private.sendMail(frame.data);
        }
    },

    sendTest(frame) {
        return mailService.utils.generateContent({template: 'test'})
            .then((content) => {
                const payload = {
                    mail: [{
                        message: {
                            to: frame.user.get('email'),
                            subject: common.i18n.t('common.api.mail.testGhostEmail'),
                            html: content.html,
                            text: content.text
                        }
                    }]
                };

                return _private.sendMail(payload);
            });
    }
};
