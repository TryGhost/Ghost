const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const mailService = require('../../services/mail');
const api = require('./');
let mailer;
let _private = {};

const messages = {
  unableToSendEmail: 'Ghost is currently unable to send email.',
  seeLinkForInstructions: 'See {link} for instructions.',
  testGhostEmail: 'Test Ghost Email',
};

_private.sendMail = (object) => {
  if (!(mailer instanceof mailService.GhostMailer)) {
    mailer = new mailService.GhostMailer();
  }

  return mailer.send(object.mail[0].message).catch((err) => {
    if (mailer.state.usingDirect) {
      api.notifications.add(
        {
          notifications: [
            {
              type: 'warn',
              message: [
                tpl(messages.unableToSendEmail),
                tpl(messages.seeLinkForInstructions, {
                  link: 'https://docs.ghost.org/concepts/config/#mail',
                }),
              ].join(' '),
            },
          ],
        },
        { context: { internal: true } },
      );
    }

    return Promise.reject(err);
  });
};

_private.sendTestEmail = async (frame) => {
  const recipient = (frame.data && frame.data.to) || (frame.user && frame.user.get('email'));
  if (!recipient) {
    throw new errors.BadRequestError({
      message: 'Recipient email address is required to send a test email.',
    });
  }

  const testMailer = new mailService.GhostMailer();
  await testMailer.send({
    to: recipient,
    subject: tpl(messages.testGhostEmail),
    html: '<p>Your Ghost mail configuration is working properly!</p>',
    text: 'Your Ghost mail configuration is working properly!',
  });

  return {
    mail: [
      {
        sent: true,
        to: recipient,
      },
    ],
  };
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'mail',

  send: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    query(frame) {
      return _private.sendMail(frame.data);
    },
  },

  sendTestEmail: {
    statusCode: 200,
    headers: {
      cacheInvalidate: false,
    },
    permissions: {
      docName: 'settings',
      method: 'edit',
    },
    data: ['to'],
    query(frame) {
      return _private.sendTestEmail(frame);
    },
  },
};

module.exports = controller;
