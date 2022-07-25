const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {MemberCommentEvent} = require('@tryghost/member-events');
const DomainEvents = require('@tryghost/domain-events');

const messages = {
    commentNotFound: 'Comment could not be found',
    memberNotFound: 'Unable to find member',
    likeNotFound: 'Unable to find like',
    alreadyLiked: 'This comment was liked already',
    replyToReply: 'Can not reply to a reply'
};

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
        await this.emails.notifyPostAuthors(comment);

        if (comment.get('parent_id')) {
            await this.emails.notifyParentCommentAuthor(comment);
        }
    }

    /**
     * Dispatch an event that we created a new comments posted by given member
     * @param {Object} member member model that posted the comment
     */
    dispatchCommentEvent(member) {
        DomainEvents.dispatch(MemberCommentEvent.create({
            memberId: member.id, 
            memberLastSeenAt: member.get('last_seen_at'), 
            memberLastCommentedAt: member.get('last_commented_at')
        }, new Date()));
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

    /**
     * @param {string} id - The ID of the Comment to get
     * @param {any} options
     */
    async getCommentByID(id, options) {
        const model = await this.models.Comment.findOne({id}, options);

        if (!model) {
            throw new errors.NotFoundError({
                messages: tpl(messages.commentNotFound)
            });
        }

        return model;
    }

    /**
     * @param {string} post - The ID of the Post to comment on
     * @param {string} member - The ID of the Member to comment as
     * @param {string} comment - The HTML content of the Comment
     * @param {any} options
     */
    async commentOnPost(post, member, comment, options) {
        const memberModel = await this.models.Member.findOne({
            id: member
        }, {
            require: true,
            ...options
        });

        const model = await this.models.Comment.add({
            post_id: post,
            member_id: member,
            parent_id: null,
            html: comment,
            status: 'published'
        }, options);

        if (!options.context.internal) {
            await this.sendNewCommentNotifications(model);
        }

        this.dispatchCommentEvent(memberModel);

        return model;
    }

    /**
     * @param {string} parent - The ID of the Comment to reply to
     * @param {string} member - The ID of the Member to comment as
     * @param {string} comment - The HTML content of the Comment
     * @param {any} options
     */
    async replyToComment(parent, member, comment, options) {
        const memberModel = await this.models.Member.findOne({
            id: member
        }, {
            require: true,
            ...options
        });

        const parentComment = await this.getCommentByID(parent, options);
        if (!parentComment) {
            throw new errors.BadRequestError({
                message: tpl(messages.commentNotFound)
            });
        }

        if (parentComment.get('parent_id') !== null) {
            throw new errors.BadRequestError({
                message: tpl(messages.replyToReply)
            });
        }

        const model = await this.models.Comment.add({
            post_id: parentComment.get('post_id'),
            member_id: member,
            parent_id: parentComment.id,
            html: comment,
            status: 'published'
        }, options);

        if (!options.context.internal) {
            await this.sendNewCommentNotifications(model);
        }
        this.dispatchCommentEvent(memberModel);

        return model;
    }

    /**
     * @param {string} id - The ID of the Comment to delete
     * @param {string} member - The ID of the Member to delete as
     * @param {any} options
     */
    async deleteComment(id, member, options) {
        const existingComment = await this.getCommentByID(id, options);

        if (existingComment.get('member_id') !== member) {
            throw new errors.NoPermissionError({
                // todo fix message
                message: tpl(messages.memberNotFound)
            });
        }

        const model = await this.models.Comment.edit({
            status: 'deleted'
        }, {
            id,
            require: true,
            ...options
        });

        return model;
    }

    /**
     * @param {string} id - The ID of the Comment to edit
     * @param {string} member - The ID of the Member to edit as
     * @param {string} comment - The new HTML content of the Comment
     * @param {any} options
     */
    async editCommentContent(id, member, comment, options) {
        const existingComment = await this.getCommentByID(id, options);

        if (!comment) {
            return existingComment;
        }

        if (existingComment.get('member_id') !== member) {
            throw new errors.NoPermissionError({
                // todo fix message
                message: tpl(messages.memberNotFound)
            });
        }

        const model = await this.models.Comment.edit({
            html: comment
        }, {
            id,
            require: true,
            ...options
        });

        return model;
    }
}

module.exports = CommentsService;
