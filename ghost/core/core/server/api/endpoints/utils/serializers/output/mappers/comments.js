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
    'feature_image'
];

const countFields = [
    'replies',
    'direct_replies',
    'likes'
];

const countFieldsAdmin = [
    'replies',
    'direct_replies',
    'likes',
    'reports'
];

function getRequestedFields(frame) {
    const fields = frame?.original?.query?.fields;

    if (!fields || typeof fields !== 'string') {
        return null;
    }

    return new Set(fields.split(',').map(field => field.trim()).filter(Boolean));
}

const commentMapper = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const isPublicRequest = utils.isMembersAPI(frame);

    // For admin requests, we want to show a snippet for ALL replies
    // Use in_reply_to if available, otherwise fall back to parent for first-level replies only
    // (first-level replies have parent_id but no in_reply_to_id)
    const replyToComment = jsonModel.in_reply_to || (!isPublicRequest && jsonModel.parent_id && !jsonModel.in_reply_to_id && jsonModel.parent);

    if (replyToComment && (replyToComment.status === 'published' || (!isPublicRequest && replyToComment.status === 'hidden'))) {
        jsonModel.in_reply_to_snippet = htmlToPlaintext.commentSnippet(replyToComment.html);
    } else if (replyToComment && replyToComment.status !== 'published') {
        jsonModel.in_reply_to_snippet = '[removed]';
    } else {
        jsonModel.in_reply_to_snippet = null;
    }

    // Only null out in_reply_to_id if it wasn't set in the original model
    // (i.e., don't overwrite a valid in_reply_to_id just because the relation wasn't loaded)
    if (!jsonModel.in_reply_to && !jsonModel.in_reply_to_id) {
        jsonModel.in_reply_to_id = null;
    }

    const fields = getRequestedFields(frame);
    const includesHtml = !fields || fields.has('html');
    const response = _.pick(jsonModel, fields ? commentFields.filter(field => fields.has(field)) : commentFields);

    if (!fields || fields.has('pinned')) {
        if (Object.prototype.hasOwnProperty.call(jsonModel, 'pinned')) {
            response.pinned = Boolean(jsonModel.pinned);
        } else {
            const canShowPinned = !jsonModel.parent_id && Boolean(jsonModel.pinned_at);
            response.pinned = isPublicRequest
                ? canShowPinned && jsonModel.status === 'published'
                : canShowPinned;
        }
    }

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
        response.post = _.pick(jsonModel.post, postFields);

        // Compute excerpt from custom_excerpt or plaintext (same logic as post serializer)
        if (jsonModel.post.custom_excerpt) {
            response.post.excerpt = jsonModel.post.custom_excerpt;
        } else if (jsonModel.post.plaintext) {
            response.post.excerpt = jsonModel.post.plaintext.substring(0, 500);
        }
    }

    if (jsonModel.count && jsonModel.count.liked !== undefined) {
        response.liked = jsonModel.count.liked > 0;
    }

    if (jsonModel.count) {
        response.count = _.pick(jsonModel.count, isPublicRequest ? countFields : countFieldsAdmin);
    }

    if (includesHtml && isPublicRequest && jsonModel.status !== 'published') {
        response.html = null;
    }

    // Deleted comments should never expose their content
    if (includesHtml && jsonModel.status === 'deleted') {
        response.html = null;
    }

    return response;
};

module.exports = commentMapper;
