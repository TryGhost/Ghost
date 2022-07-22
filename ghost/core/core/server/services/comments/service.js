class CommentsService {
    constructor({config, logging, models, mailer, settingsCache, urlService, urlUtils}) {
        this.config = config;
        this.logging = logging;
        this.models = models;
        this.mailer = mailer;
        this.settingsCache = settingsCache;
        this.urlService = urlService;
        this.urlUtils = urlUtils;

        const Emails = require('./emails');
        this.emails = new Emails(this);
    }

    async sendNewCommentNotifications(comment) {
        this.emails.notifyPostAuthors(comment);

        if (comment.get('parent_id')) {
            this.emails.notifyParentCommentAuthor(comment);
        }
    }

    async reportComment(commentId, reporter) {
        const comment = await this.models.Comment.findOne({id: commentId}, {require: true});

        // Check if this reporter already reported this comment (then don't send an email)?
        const existing = await this.models.CommentReport.findOne({
            comment_id: comment.id,
            member_id: reporter.id
        });

        if (existing) {
            // Ignore silently for now
            return;
        }

        // Save report model
        await this.models.CommentReport.add({
            comment_id: comment.id,
            member_id: reporter.id
        });

        await this.emails.notifiyReport(comment, reporter);
    }
}

module.exports = CommentsService;
