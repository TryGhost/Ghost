const mapComment = require('./comments');
const url = require('../utils/url');
const _ = require('lodash');

const memberFields = [
    'id',
    'uuid',
    'name',
    'email',
    'avatar_image'
];

const postFields = [
    'id',
    'uuid',
    'title',
    'url'
];

const commentEventMapper = (json, frame) => {
    return {
        ...json,
        data: mapComment(json.data, frame)
    };
};

const clickEventMapper = (json, frame) => {
    const linkFields = [
        'from',
        'to'
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

    if (data.created_at) {
        response.created_at = data.created_at;
    }

    if (data.id) {
        response.id = data.id;
    }

    return {
        ...json,
        data: response
    };
};

const aggregatedClickEventMapper = (json) => {
    const data = json.data;
    const response = {};

    if (data.member) {
        response.member = _.pick(data.member, memberFields);
    } else {
        response.member = null;
    }

    if (data.created_at) {
        response.created_at = data.created_at;
    }

    if (data.id) {
        response.id = data.id;
    }

    response.count = {
        clicks: data.count?.clicks ?? 0
    };

    return {
        ...json,
        data: response
    };
};

const feedbackEventMapper = (json, frame) => {
    const feedbackFields = [
        'id',
        'score',
        'created_at'
    ];

    const data = json.data;
    const response = _.pick(data, feedbackFields);

    if (data.post) {
        url.forPost(data.post.id, data.post, frame);
        response.post = _.pick(data.post, postFields);
    } else {
        response.post = null;
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

function serializeAttribution(attribution) {
    if (!attribution) {
        return attribution;
    }

    return {
        id: attribution?.id,
        type: attribution?.type,
        url: attribution?.url,
        title: attribution?.title,
        referrer_source: attribution?.referrerSource,
        referrer_medium: attribution?.referrerMedium,
        referrer_url: attribution.referrerUrl
    };
}

const activityFeedMapper = (event, frame) => {
    if (event.type === 'comment_event') {
        return commentEventMapper(event, frame);
    }
    if (event.type === 'click_event') {
        return clickEventMapper(event, frame);
    }
    if (event.type === 'aggregated_click_event') {
        return aggregatedClickEventMapper(event);
    }
    if (event.type === 'feedback_event') {
        return feedbackEventMapper(event, frame);
    }
    if (event.data?.attribution) {
        event.data.attribution = serializeAttribution(event.data.attribution);
    }
    // TODO: add dedicated mappers for other event types
    if (event.data?.batch_id) {
        delete event.data.batch_id;
    }
    if (event.data?.subscriptionCreatedEvent) {
        delete event.data.subscriptionCreatedEvent;
    }

    if (event.data.member) {
        event.data.member = _.pick(event.data.member, memberFields);
    } else {
        event.data.member = null;
    }
    return event;
};

module.exports = activityFeedMapper;
