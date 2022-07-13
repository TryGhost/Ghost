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
}

module.exports = CommentsService;
