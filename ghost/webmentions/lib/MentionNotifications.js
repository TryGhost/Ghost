const {promises: fs} = require('fs');
const path = require('path');
// const glob = require('glob');

module.exports = class MentionNotifications {
    constructor({logging, models, settingsCache, urlUtils, siteDomain, settingsHelpers, mailer}) {
        this.models = models;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.siteDomain = siteDomain;
        this.settingsHelpers = settingsHelpers;
        this.Handlebars = require('handlebars');
        this.mailer = mailer;
        this.logging = logging;
        // this.registerPartials();
    }

    get defaultEmailDomain() {
        return this.settingsHelpers.getDefaultEmailDomain();
    }

    async renderEmailTemplate(templateName, data) {
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `${templateName}.hbs`), 'utf8');
        const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        const textTemplate = require(`./email-templates/${templateName}.txt.js`);

        const html = htmlTemplate(data);
        const text = textTemplate(data);

        return {html, text};
    }

    get fromEmailAddress() {
        return `ghost@${this.defaultEmailDomain}`;
    }

    async notifyMentionReceived(mention) {
        const users = await this.models.User.findAll(); // sending to all staff users for now
        for (const user of users) {
            const to = user.toJSON().email;
            const subject = `You've been mentioned!`;

            const templateData = {
                sourceUrl: mention.source,
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.fromEmailAddress,
                toEmail: to,
                staffUrl: this.urlUtils.urlJoin(this.urlUtils.urlFor('admin', true), '#', `/settings/staff/${user.toJSON().slug}`)
            };
            const {html, text} = await this.renderEmailTemplate('new-mention-received', templateData);

            await this.sendMail({
                to,
                subject,
                html,
                text
            });
        }
    }

    get notificationFromAddress() {
        return this.settingsHelpers.getMembersSupportAddress();
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
};
