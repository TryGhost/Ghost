const _ = require('lodash');
const utils = require('../../..');
const url = require('../utils/url');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const commentFields = [
    'id',
    'parent_id',
    'in_reply_to_id',
    'in_reply_to_snippet',
    'status',
    'html',
    'created_at',
    'edited_at'
];

const memberFields = [
    'id',
    'uuid',
    'name',
    'expertise',
    'avatar_image'
];

const memberFieldsAdmin = [
    'id',
    'uuid',
    'name',
    'email',
    'expertise',
    'avatar_image',
    'can_comment',
    'commenting'
];

const postFields = [
    'id',
    'uuid',
    'title',
    'url',
    'feature_image',
    'excerpt',
    'plaintext'
];

const countFields = [
    'replies',
    'likes'
];

const countFieldsAdmin = [
    'replies',
    'likes',
    'reports'
];

const commentMapper = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const isPublicRequest = utils.isMembersAPI(frame);

    // For admin requests, we want to show a snippet for ALL replies
    // Use inReplyTo if available, otherwise fall back to parent for first-level replies
    const replyToComment = jsonModel.inReplyTo || (!isPublicRequest && jsonModel.parent_id && jsonModel.parent);

    if (replyToComment && (replyToComment.status === 'published' || (!isPublicRequest && replyToComment.status === 'hidden'))) {
        jsonModel.in_reply_to_snippet = htmlToPlaintext.commentSnippet(replyToComment.html);
    } else if (replyToComment && replyToComment.status !== 'published') {
        jsonModel.in_reply_to_snippet = '[removed]';
    } else {
        jsonModel.in_reply_to_snippet = null;
    }

    if (!jsonModel.inReplyTo) {
        jsonModel.in_reply_to_id = null;
    }

    const response = _.pick(jsonModel, commentFields);

    if (jsonModel.member) {
        response.member = _.pick(jsonModel.member, isPublicRequest ? memberFields : memberFieldsAdmin);
    } else {
        response.member = null;
    }

    if (jsonModel.replies) {
        response.replies = jsonModel.replies.map(reply => commentMapper(reply, frame));
    }

    if (jsonModel.parent) {
        response.parent = commentMapper(jsonModel.parent, frame);
    }

    if (jsonModel.post) {
        // We could use the post mapper here, but we need less field + don't need all the async behavior support
        url.forPost(jsonModel.post.id, jsonModel.post, frame);
        const postData = _.pick(jsonModel.post, postFields);
        
        // Generate excerpt from plaintext if excerpt is not available (matches Posts API behavior)
        // This matches what the Posts API does: use custom_excerpt if available, otherwise generate from plaintext (first 500 chars)
        if (!postData.excerpt) {
            // Check if custom_excerpt exists on the original post model (not in postFields, so check jsonModel)
            if (jsonModel.post.custom_excerpt) {
                postData.excerpt = jsonModel.post.custom_excerpt;
            } else if (postData.plaintext) {
                // Generate from plaintext (first 500 chars, matching Posts API)
                postData.excerpt = postData.plaintext.substring(0, 500);
            }
        }
        
        // Remove plaintext from response (we only needed it to generate excerpt)
        delete postData.plaintext;
        
        response.post = postData;
    }

    if (jsonModel.count && jsonModel.count.liked !== undefined) {
        response.liked = jsonModel.count.liked > 0;
    }

    if (jsonModel.count) {
        response.count = _.pick(jsonModel.count, isPublicRequest ? countFields : countFieldsAdmin);
    }

    if (isPublicRequest) {
        if (jsonModel.status !== 'published') {
            response.html = null;
        }
    }

    // Deleted comments should never expose their content
    if (jsonModel.status === 'deleted') {
        response.html = null;
    }

    return response;
};

module.exports = commentMapper;
