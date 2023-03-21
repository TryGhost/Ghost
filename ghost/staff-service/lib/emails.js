const {promises: fs, readFileSync} = require('fs');
const path = require('path');
const moment = require('moment');
const glob = require('glob');

class StaffServiceEmails {
    constructor({logging, models, mailer, settingsHelpers, settingsCache, urlUtils}) {
        this.logging = logging;
        this.models = models;
        this.mailer = mailer;
        this.settingsHelpers = settingsHelpers;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;

        this.Handlebars = require('handlebars');
        this.registerPartials();
    }

    async notifyFreeMemberSignup({
        member, attribution
    }, options) {
        const users = await this.models.User.getEmailAlertUsers('free-signup', options);

        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);

            const subject = `🥳 Free member signup: ${memberData.name}`;

            let attributionTitle = attribution?.title || '';
            // In case of a homepage attribution, we want to show the title as "Homepage" on email
            if (attributionTitle === 'homepage') {
                attributionTitle = 'Homepage';
            }

            const templateData = {
                memberData,
                attributionTitle,
                attributionUrl: attribution?.url || '',
                referrerSource: attribution?.referrerSource,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.fromEmailAddress,
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

    async notifyPaidSubscriptionStarted({member, subscription, offer, tier, attribution}, options = {}) {
        const users = await this.models.User.getEmailAlertUsers('paid-started', options);

        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);

            const subject = `💸 Paid subscription started: ${memberData.name}`;

            const amount = this.getAmount(subscription?.amount);
            const formattedAmount = this.getFormattedAmount({currency: subscription?.currency, amount});
            const interval = subscription?.interval || '';
            const tierData = {
                name: tier?.name || '',
                details: `${formattedAmount}/${interval}`
            };

            const subscriptionData = {
                startedOn: this.getFormattedDate(subscription.startDate)
            };

            let offerData = this.getOfferData(offer);

            let attributionTitle = attribution?.title || '';
            // In case of a homepage attribution, we want to show the title as "Homepage" on email
            if (attributionTitle === 'homepage') {
                attributionTitle = 'Homepage';
            }

            const templateData = {
                memberData,
                attributionTitle,
                attributionUrl: attribution?.url || '',
                referrerSource: attribution?.referrerSource,
                tierData,
                offerData,
                subscriptionData,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.fromEmailAddress,
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

    async notifyPaidSubscriptionCanceled({member, tier, subscription}, options = {}) {
        const users = await this.models.User.getEmailAlertUsers('paid-canceled', options);

        for (const user of users) {
            const to = user.email;
            const memberData = this.getMemberData(member);
            const subject = `⚠️ Cancellation: ${memberData.name}`;

            const amount = this.getAmount(subscription?.amount);
            const formattedAmount = this.getFormattedAmount({currency: subscription?.currency, amount});
            const interval = subscription?.interval;
            const tierDetail = `${formattedAmount}/${interval}`;
            const tierData = {
                name: tier?.name || '',
                details: tierDetail
            };

            const subscriptionData = {
                expiryAt: this.getFormattedDate(subscription.cancelAt),
                canceledAt: this.getFormattedDate(subscription.canceledAt),
                cancellationReason: subscription.cancellationReason || ''
            };

            const templateData = {
                memberData,
                tierData,
                subscriptionData,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.fromEmailAddress,
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

    /**
     * @param {object} recipient
     * @param {string} recipient.email
     * @param {string} recipient.slug
     */
    async getSharedData(recipient) {
        return {
            siteTitle: this.settingsCache.get('title'),
            siteUrl: this.urlUtils.getSiteUrl(),
            siteDomain: this.siteDomain,
            accentColor: this.settingsCache.get('accent_color'),
            fromEmail: this.fromEmailAddress,
            toEmail: recipient.email,
            staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${recipient.slug}`)
        };
    }

    /**
     *
     * @param {object} eventData
     * @param {object} eventData.milestone
     *
     * @returns {Promise<void>}
     */
    async notifyMilestoneReceived({milestone}) {
        if (!milestone?.emailSentAt || milestone?.meta?.reason) {
            // Do not send an email when no email was set to be sent or a reason
            // not to send provided
            return;
        }

        const formattedValue = this.getFormattedAmount({currency: milestone?.currency, amount: milestone.value, maximumFractionDigits: 0});
        const milestoneEmailConfig = require('./milestone-email-config')(this.settingsCache.get('title'), formattedValue);

        const emailData = milestoneEmailConfig?.[milestone.type]?.[milestone.value];

        if (!emailData || Object.keys(emailData).length === 0) {
            // Do not attempt to send an email with invalid or missing data
            this.logging.warn('No Milestone email sent. Invalid or missing data.');
            return;
        }

        const emailPromises = [];
        const users = await this.models.User.getEmailAlertUsers('milestone-received');

        for (const user of users) {
            const to = user.email;

            const templateData = {
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                fromEmail: this.fromEmailAddress,
                ...emailData,
                partial: `milestones/${milestone.value}`,
                toEmail: to,
                adminUrl: this.urlUtils.urlFor('admin', true),
                staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${user.slug}`)
            };

            const {html, text} = await this.renderEmailTemplate('new-milestone-received', templateData);

            emailPromises.push(await this.sendMail({
                to,
                subject: emailData.subject,
                html,
                text
            }));
        }

        const results = await Promise.allSettled(emailPromises);

        for (const result of results) {
            if (result.status === 'rejected') {
                this.logging.warn(result?.reason);
            }
        }
    }

    // Utils

    /** @private */
    getMemberData(member) {
        let name = member?.name || member?.email;
        return {
            name,
            email: member?.email,
            showEmail: !!member?.name,
            adminUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/members/${member.id}`),
            initials: this.extractInitials(name),
            location: this.getGeolocationData(member.geolocation),
            createdAt: moment(member.created_at).format('D MMM YYYY')
        };
    }

    /** @private */
    getGeolocationData(geolocation) {
        if (!geolocation) {
            return null;
        }

        try {
            const geolocationData = JSON.parse(geolocation);
            return geolocationData?.country || null;
        } catch (e) {
            return null;
        }
    }

    /** @private */
    getFormattedAmount({amount = 0, currency, maximumFractionDigits = 2}) {
        if (!currency) {
            return amount > 0 ? Intl.NumberFormat('en', {maximumFractionDigits}).format(amount) : '';
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol',
            maximumFractionDigits,
            // see https://github.com/andyearnshaw/Intl.js/issues/123
            minimumFractionDigits: maximumFractionDigits
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
    getOfferData(offer) {
        if (offer) {
            let offAmount = '';
            let offDuration = '';

            if (offer.duration === 'once') {
                offDuration = ', first payment';
            } else if (offer.duration === 'repeating') {
                offDuration = `, first ${offer.durationInMonths} months`;
            } else if (offer.duration === 'forever') {
                offDuration = `, forever`;
            } else if (offer.duration === 'trial') {
                offDuration = '';
            }
            if (offer.type === 'percent') {
                offAmount = `${offer.amount}% off`;
            } else if (offer.type === 'fixed') {
                const amount = this.getAmount(offer.amount);
                offAmount = `${this.getFormattedAmount({currency: offer.currency, amount})} off`;
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

    get defaultEmailDomain() {
        return this.settingsHelpers.getDefaultEmailDomain();
    }

    get membersAddress() {
        // TODO: get from address of default newsletter?
        return `noreply@${this.defaultEmailDomain}`;
    }

    get fromEmailAddress() {
        return `ghost@${this.defaultEmailDomain}`;
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
            from: this.fromEmailAddress,
            forceTextContent: true
        }, message);

        return this.mailer.send(msg);
    }

    registerPartials() {
        const rootDirname = './email-templates/partials/';
        const files = glob.sync('*.hbs', {cwd: path.join(__dirname, rootDirname)});
        files.forEach((fileName) => {
            const name = fileName.replace(/.hbs$/, '');
            const filePath = path.join(__dirname, rootDirname, `${name}.hbs`);
            const content = readFileSync(filePath, 'utf8');
            this.Handlebars.registerPartial(name, content);
        });
    }

    async renderHTML(templateName, data) {
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `${templateName}.hbs`), 'utf8');
        const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());

        this.Handlebars.registerHelper('eq', function (arg, value, options) {
            if (arg === value) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        this.Handlebars.registerHelper('limit', function (array, limit) {
            if (!Array.isArray(array)) {
                return [];
            }
            return array.slice(0,limit);
        });

        let sharedData = {};
        if (data.recipient) {
            sharedData = await this.getSharedData(data.recipient);
        }

        return htmlTemplate({
            ...data,
            ...sharedData
        });
    }

    async renderText(templateName, data) {
        const textTemplate = require(`./email-templates/${templateName}.txt.js`);

        let sharedData = {};
        if (data.recipient) {
            sharedData = await this.getSharedData(data.recipient);
        }

        return textTemplate({
            ...data,
            ...sharedData
        });
    }

    async renderEmailTemplate(templateName, data) {
        const html = await this.renderHTML(templateName, data);
        const text = await this.renderText(templateName, data);

        return {html, text};
    }
}

module.exports = StaffServiceEmails;
