const mapComment = require('./comments');
const url = require('../utils/url');
const _ = require('lodash');

const commentEventMapper = (json, frame) => {
    return {
        ...json,
        data: mapComment(json.data, frame)
    };
};

const clickEventMapper = (json, frame) => {
    const memberFields = [
        'id',
        'uuid',
        'name',
        'email',
        'avatar_image'
    ];

    const linkFields = [
        'from',
        'to'
    ];

    const postFields = [
        'id',
        'uuid',
        'title',
        'url'
    ];

    const data = json.data;
    const response = {};

    if (data.link && data.link.post) {
        // We could use the post mapper here, but we need less field + don't need al the async behavior support
        url.forPost(data.link.post.id, data.link.post, frame);
        response.post = _.pick(data.link.post, postFields);
    }

    if (data.link) {
        response.link = _.pick(data.link, linkFields);
    }

    if (data.member) {
        response.member = _.pick(data.member, memberFields);
    } else {
        response.member = null;
    }

    return {
        ...json,
        data: response
    };
};

const activityFeedMapper = (event, frame) => {
    if (event.type === 'comment_event') {
        return commentEventMapper(event, frame);
    }
    if (event.type === 'click_event') {
        return clickEventMapper(event, frame);
    }
    return event;
};

module.exports = activityFeedMapper;
