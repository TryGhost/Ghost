const mapComment = require('./comments');

const commentEventMapper = (json, frame) => {
    return {
        ...json,
        data: mapComment(json.data, frame)
    };
};

const activityFeedMapper = (event, frame) => {
    if (event.type === 'comment_event') {
        return commentEventMapper(event, frame);
    }
    return event;
};

module.exports = activityFeedMapper;
