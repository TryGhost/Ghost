const {promises: fs} = require('fs');
const path = require('path');

class CommentsService {
    constructor({config, models, mailer, settingsCache, urlUtils}) {
        this.config = config;
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

    async sendNewCommentNotifications(comment) {
        this.notifyPostAuthor(comment);

        if (comment.get('parent_id')) {
            this.notifyParentCommentAuthor(comment);
        }
    }

    async notifyPostAuthor(comment) {
        const post = await this.models.Post.findOne({id: comment.get('post_id')}, {withRelated: ['authors']});

        for (const author of post.related('authors')) {
            if (!author.get('comment_notifications')) {
                continue;
            }

            const from = this.notificationFromAddress;
            const to = author.get('email');
            const subject = 'You have a new comment on one of your posts';

            const templateData = {
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: from
            };

            const html = await this.renderEmailTemplate('new-comment', templateData);

            this.mailer.send({
                from,
                to,
                subject,
                html,
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

    async renderEmailTemplate(name, data) {
        const templateSource = await fs.readFile(path.join(__dirname, './emails/', `${name}.hbs`), 'utf8');
        const template = this.Handlebars.compile(Buffer.from(templateSource).toString());

        return template(data);
    }
}

module.exports = CommentsService;
