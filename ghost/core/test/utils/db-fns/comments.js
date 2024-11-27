const models = require('../../../core/server/models');

const dbFns = {
    /**
    * @typedef {Object} AddCommentData
    * @property {string} post_id
    * @property {string} member_id
    * @property {string} [parent_id]
    * @property {string} [in_reply_to_id]
    * @property {string} [html='This is a comment']
    * @property {string} [status]
    * @property {Date} [created_at]
    */
    /**
    * @typedef {Object} AddCommentReplyData
    * @property {string} member_id
    * @property {string} [html='This is a reply']
    * @property {Date} [created_at]
    * @property {string} [status]
    */
    /**
    * @typedef {AddCommentData & {replies: AddCommentReplyData[]}} AddCommentWithRepliesData
    */

    /**
    * @param {AddCommentData} data
    * @returns {Promise<any>}
    */
    addComment: async (data) => {
        return await models.Comment.add({
            post_id: data.post_id,
            member_id: data.member_id,
            parent_id: data.parent_id,
            html: data.html || '<p>This is a comment</p>',
            created_at: data.created_at,
            in_reply_to_id: data.in_reply_to_id,
            status: data.status || 'published'
        });
    },
    /**
    * @param {AddCommentWithRepliesData}  data
    * @returns {Promise<any>}
    */
    addCommentWithReplies: async (data) => {
        const {replies, ...commentData} = data;

        const parent = await dbFns.addComment(commentData);
        const createdReplies = [];

        for (const reply of replies) {
            const createdReply = await dbFns.addComment({
                post_id: parent.get('post_id'),
                member_id: reply.member_id,
                parent_id: parent.get('id'),
                html: reply.html || '<p>This is a reply</p>',
                status: reply.status
            });
            createdReplies.push(createdReply);
        }

        return {parent, replies: createdReplies};
    },
    /**
    * @param {Object} data
    * @param {string} data.comment_id
    * @param {string} data.member_id
    * @returns {Promise<any>}
    */
    addLike: async (data) => {
        return await models.CommentLike.add({
            comment_id: data.comment_id,
            member_id: data.member_id
        });
    },
    /**
    * @param {Object} data
    * @param {string} data.comment_id
    * @param {string} data.member_id
    * @returns {Promise<any>}
    */
    addReport: async (data) => {
        return await models.CommentReport.add({
            comment_id: data.comment_id,
            member_id: data.member_id
        });
    }
};

module.exports = dbFns;
