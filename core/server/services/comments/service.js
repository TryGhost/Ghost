const {promises: fs} = require('fs');
const path = require('path');
const {ghostMailer} = require('../newsletters');

class CommentsService {
    constructor({config, logging, models, mailer, settingsCache, urlUtils}) {
        this.config = config;
        this.logging = logging;
        this.models = models;
        this.mailer = mailer;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;

        this.Handlebars = require('handlebars');
    }

    get siteDomain() {
        return this.urlUtils.getSiteUrl()
            .match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
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

    async sendMail(message) {
        if (process.env.NODE_ENV !== 'production') {
            this.logging.warn(message.text);
        }

        let msg = Object.assign({
            from: this.notificationFromAddress,
            forceTextContent: true
        }, message);

        return ghostMailer.send(msg);
    }

    async sendNewCommentNotifications(comment) {
        this.notifyPostAuthors(comment);

        if (comment.get('parent_id')) {
            this.notifyParentCommentAuthor(comment);
        }
    }

    async notifyPostAuthors(comment) {
        const post = await this.models.Post.findOne({id: comment.get('post_id')}, {withRelated: ['authors']});

        for (const author of post.related('authors')) {
            if (!author.get('comment_notifications')) {
                continue;
            }

            const to = author.get('email');
            const subject = 'You have a new comment on one of your posts';

            const templateData = {
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.notificationFromAddress
            };

            const {html, text} = await this.renderEmailTemplate('new-comment', templateData);

            this.sendMail({
                to,
                subject,
                html,
                text,
                forceTextContent: true
            });
        }
    }

    async notifyParentCommentAuthor(comment) {
        const parent = await this.models.Comment.findOne({id: comment.get('parent_id')});

        if (parent && parent.get('status') === 'published') {
            // do the things
        }
    }

    async renderEmailTemplate(templateName, data) {
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './emails/', `${templateName}.hbs`), 'utf8');
        const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        const textTemplate = require(`./emails/${templateName}.txt.js`);

        const html = htmlTemplate(data);
        const text = textTemplate(data);

        return {html, text};
    }
}

module.exports = CommentsService;
