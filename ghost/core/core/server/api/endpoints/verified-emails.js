const dns = require('node:dns/promises');
const models = require('../../models');
const {getInboxLinks} = require('../../lib/get-inbox-links');
const emailVerificationService = require('../../services/email-verification');
const emailAddressService = require('../../services/email-address');

const inboxLinksDnsResolver = new dns.Resolver({tries: 1, timeout: 3000});

const controller = {
    docName: 'verified_emails',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['limit', 'page', 'order', 'filter'],
        permissions: true,
        async query(frame) {
            return models.VerifiedEmail.findPage(frame.options);
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: true,
        async query(frame) {
            const data = frame.data.verified_emails[0];
            const verifiedEmail = await emailVerificationService.add(data.email, data.context);

            let inboxLinks = null;
            if (verifiedEmail.get('status') === 'pending') {
                const sender = emailAddressService.service.defaultFromEmail.address;
                inboxLinks = await getInboxLinks({
                    recipient: data.email,
                    sender,
                    dnsResolver: inboxLinksDnsResolver
                }) || null;
            }

            return {
                data: [verifiedEmail],
                meta: {inbox_links: inboxLinks}
            };
        }
    },

    verify: {
        headers: {cacheInvalidate: true},
        permissions: {method: 'edit'},
        async query(frame) {
            const data = frame.data.verified_emails[0];
            const {verifiedEmail, context} = await emailVerificationService.verify(data.token);
            return {
                data: [verifiedEmail],
                meta: {context: context || null}
            };
        }
    }
};

module.exports = controller;
