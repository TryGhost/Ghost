const {promises: fs} = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');

class StaffServiceEmails {
    constructor({config, logging, models, mailer, settingsCache, urlService, urlUtils}) {
        this.config = config;
        this.logging = logging;
        this.models = models;
        this.mailer = mailer;
        this.settingsCache = settingsCache;
        this.urlService = urlService;
        this.urlUtils = urlUtils;

        this.Handlebars = require('handlebars');
    }

    async notifyFreeMemberSignup(member) {
        const users = await this.models.User.getEmailAlertUsers('free-signup');

        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);

            const subject = `🥳 New free member: ${memberData.name}`;

            const templateData = {
                memberData,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.notificationFromAddress,
                toEmail: to,
                staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${user.slug}`)
            };

            const {html, text} = await this.renderEmailTemplate('new-free-signup', templateData);

            await this.sendMail({
                to,
                subject,
                html,
                text
            });
        }
    }

    async notifyPaidSubscriptionStarted({member, subscription, offer, tier}) {
        const users = await this.models.User.getEmailAlertUsers('paid-started');

        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);

            const subject = `🤑 New paid member: ${memberData.name}`;

            const amount = this.getAmount(subscription?.plan_amount);
            const formattedAmount = this.getFormattedAmount({currency: subscription?.plan_currency, amount});
            const interval = subscription?.plan_interval || '';
            const tierData = {
                name: tier?.name || '',
                details: `${formattedAmount}/${interval}`
            };

            const subscriptionData = {
                startedOn: this.getFormattedDate(subscription.start_date)
            };

            let offerData = this.getOfferData(offer);

            const templateData = {
                memberData,
                tierData,
                offerData,
                subscriptionData,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.notificationFromAddress,
                toEmail: to,
                staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${user.slug}`)
            };

            const {html, text} = await this.renderEmailTemplate('new-paid-started', templateData);

            await this.sendMail({
                to,
                subject,
                html,
                text
            });
        }
    }

    async notifyPaidSubscriptionCanceled({member, cancellationReason, tier, subscription}) {
        const users = await this.models.User.getEmailAlertUsers('paid-canceled');
        const subscriptionPriceData = _.get(subscription, 'items.data[0].price');
        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);
            const subject = `Paid member cancellation: ${memberData.name}`;

            const amount = this.getAmount(subscriptionPriceData?.unit_amount);
            const formattedAmount = this.getFormattedAmount({currency: subscriptionPriceData?.currency, amount});
            const interval = subscriptionPriceData?.recurring?.interval;
            const tierDetail = `${formattedAmount}/${interval}`;
            const tierData = {
                name: tier?.name || '',
                details: tierDetail
            };

            const subscriptionData = {
                expiryAt: this.getFormattedStripeDate(subscription.cancel_at),
                canceledAt: this.getFormattedStripeDate(subscription.canceled_at),
                cancellationReason: cancellationReason || ''
            };

            const templateData = {
                memberData,
                tierData,
                subscriptionData,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.notificationFromAddress,
                toEmail: to,
                staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${user.slug}`)
            };

            const {html, text} = await this.renderEmailTemplate('new-paid-cancellation', templateData);

            await this.sendMail({
                to,
                subject,
                html,
                text
            });
        }
    }

    // Utils

    /** @private */
    getMemberData(member) {
        let name = member?.name || 'Anonymous';
        return {
            name: member?.name || member?.email,
            adminUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/members/${member.id}`),
            initials: this.extractInitials(name),
            location: member.geolocation?.country || null,
            createdAt: moment(member.created_at).format('D MMM YYYY')
        };
    }

    /** @private */
    getFormattedAmount({amount = 0, currency}) {
        if (!currency) {
            return '';
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol'
        }).format(amount);
    }

    /** @private */
    getAmount(amount) {
        if (!amount) {
            return 0;
        }

        return amount / 100;
    }

    /** @private */
    getFormattedDate(date) {
        if (!date) {
            return '';
        }

        return moment(date).format('D MMM YYYY');
    }

    /** @private */
    getFormattedStripeDate(stripeDate) {
        if (!stripeDate) {
            return '';
        }
        const date = new Date(stripeDate * 1000);

        return this.getFormattedDate(date);
    }

    /** @private */
    getOfferData(offer) {
        if (offer) {
            let offAmount = '';
            let offDuration = '';

            if (offer.duration === 'once') {
                offDuration = ', first payment';
            } else if (offer.duration === 'repeating') {
                offDuration = `, first ${offer.duration_in_months} months`;
            } else if (offer.duration === 'forever') {
                offDuration = `, forever`;
            } else if (offer.duration === 'trial') {
                offDuration = '';
            }
            if (offer.type === 'percent') {
                offAmount = `${offer.amount}% off`;
            } else if (offer.type === 'fixed') {
                offAmount = `${this.getFormattedAmount({currency: offer.currency, amount: offer.amount})} off`;
            } else if (offer.type === 'trial') {
                offAmount = `${offer.amount} days free`;
            }

            return {
                name: offer.name,
                details: `${offAmount}${offDuration}`
            };
        }
    }

    get siteDomain() {
        const [, siteDomain] = this.urlUtils.getSiteUrl()
            .match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));

        return siteDomain;
    }

    get membersAddress() {
        // TODO: get from address of default newsletter?
        return `noreply@${this.siteDomain}`;
    }

    // TODO: duplicated from services/members/config - exrtact to settings?
    get supportAddress() {
        const supportAddress = this.settingsCache.get('members_support_address') || 'noreply';

        // Any fromAddress without domain uses site domain, like default setting `noreply`
        if (supportAddress.indexOf('@') < 0) {
            return `${supportAddress}@${this.siteDomain}`;
        }

        return supportAddress;
    }

    get notificationFromAddress() {
        return this.supportAddress || this.membersAddress;
    }

    extractInitials(name = '') {
        const names = name.split(' ');
        const initials = names.length > 1 ? [names[0][0], names[names.length - 1][0]] : [names[0][0]];
        return initials.join('').toUpperCase();
    }

    async sendMail(message) {
        if (process.env.NODE_ENV !== 'production') {
            this.logging.warn(message.text);
        }

        let msg = Object.assign({
            from: this.notificationFromAddress,
            forceTextContent: true
        }, message);

        return this.mailer.send(msg);
    }

    async renderEmailTemplate(templateName, data) {
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `${templateName}.hbs`), 'utf8');
        const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        const textTemplate = require(`./email-templates/${templateName}.txt.js`);

        const html = htmlTemplate(data);
        const text = textTemplate(data);

        return {html, text};
    }
}

module.exports = StaffServiceEmails;
