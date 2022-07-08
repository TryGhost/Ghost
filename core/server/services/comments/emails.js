const {promises: fs} = require('fs');
const path = require('path');
const moment = require('moment');

class CommentsServiceEmails {
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

    async notifyPostAuthors(comment) {
        const post = await this.models.Post.findOne({id: comment.get('post_id')}, {withRelated: ['authors']});
        const member = await this.models.Member.findOne({id: comment.get('member_id')});

        for (const author of post.related('authors')) {
            if (!author.get('comment_notifications')) {
                continue;
            }

            const to = author.get('email');
            const subject = '💬 You have a new comment on one of your posts';

            const memberName = member.get('name') || 'Anonymous';

            const templateData = {
                siteTitle: this.settingsCache.get('title'),
                siteUrl: this.urlUtils.getSiteUrl(),
                siteDomain: this.siteDomain,
                postTitle: post.get('title'),
                postUrl: this.urlService.getUrlByResourceId(post.get('id'), {absolute: true}),
                commentHtml: comment.get('html'),
                commentDate: moment(comment.get('created_at')).tz(this.settingsCache.get('timezone')).format('D MMM YYYY'),
                memberName: memberName,
                memberBio: member.get('bio'),
                memberInitials: this.extractInitials(memberName),
                accentColor: this.settingsCache.get('accent_color'),
                fromEmail: this.notificationFromAddress,
                toEmail: to,
                staffUrl: `${this.urlUtils.getAdminUrl()}ghost/#/settings/staff/${author.get('slug')}`
            };

            const {html, text} = await this.renderEmailTemplate('new-comment', templateData);

            this.sendMail({
                to,
                subject,
                html,
                text
            });
        }
    }

    async notifyParentCommentAuthor(reply) {
        const parent = await this.models.Comment.findOne({id: reply.get('parent_id')});
        const parentMember = parent.related('member');

        if (parent?.get('status') !== 'published' || !parentMember.get('enable_comment_notifications')) {
            return;
        }

        const to = parentMember.get('email');
        const subject = '💬 You have a new reply on one of your comments';

        const post = await this.models.Post.findOne({id: reply.get('post_id')});
        const member = await this.models.Member.findOne({id: reply.get('member_id')});

        const memberName = member.get('name') || 'Anonymous';

        const templateData = {
            siteTitle: this.settingsCache.get('title'),
            siteUrl: this.urlUtils.getSiteUrl(),
            siteDomain: this.siteDomain,
            postTitle: post.get('title'),
            postUrl: this.urlService.getUrlByResourceId(post.get('id'), {absolute: true}),
            replyHtml: reply.get('html'),
            replyDate: moment(reply.get('created_at')).tz(this.settingsCache.get('timezone')).format('D MMM YYYY'),
            memberName: memberName,
            memberBio: member.get('bio'),
            memberInitials: this.extractInitials(memberName),
            accentColor: this.settingsCache.get('accent_color'),
            fromEmail: this.notificationFromAddress,
            toEmail: to,
            profileUrl: `${this.urlUtils.getSiteUrl()}#/portal/account/profile`
        };

        const {html, text} = await this.renderEmailTemplate('new-comment-reply', templateData);

        return this.sendMail({
            to,
            subject,
            html,
            text
        });
    }

    // Utils

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

module.exports = CommentsServiceEmails;
