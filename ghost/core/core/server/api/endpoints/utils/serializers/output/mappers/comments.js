const _ = require('lodash');
const utils = require('../../..');
const url = require('../utils/url');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const commentFields = [
    'id',
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
    'avatar_image'
];

const postFields = [
    'id',
    'uuid',
    'title',
    'url'
];

const countFields = [
    'replies',
    'likes'
];

const commentMapper = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    if (jsonModel.inReplyTo && jsonModel.inReplyTo.status === 'published') {
        jsonModel.in_reply_to_snippet = htmlToPlaintext.commentSnippet(jsonModel.inReplyTo.html);
    }

    const response = _.pick(jsonModel, commentFields);

    if (jsonModel.member) {
        response.member = _.pick(jsonModel.member, utils.isMembersAPI(frame) ? memberFields : memberFieldsAdmin);
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
    }

    if (jsonModel.count && jsonModel.count.liked !== undefined) {
        response.liked = jsonModel.count.liked > 0;
    }

    if (jsonModel.count) {
        response.count = _.pick(jsonModel.count, countFields);
    }

    if (utils.isMembersAPI(frame)) {
        if (jsonModel.status !== 'published') {
            response.html = null;
        }
    }

    return response;
};

module.exports = commentMapper;
