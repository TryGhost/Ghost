const _ = require('lodash');

const memberFields = [
    'id',
    'uuid',
    'name',
    'email',
    'avatar_image'
];

const failureFields = [
    'id',
    'code',
    'enhanced_code',
    'message',
    'severity',
    'failed_at',
    'event_id'
];

const failureMapper = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const response = _.pick(jsonModel, failureFields);

    if (jsonModel.member) {
        response.member = _.pick(jsonModel.member, memberFields);
    } else {
        response.member = null;
    }

    return response;
};

module.exports = failureMapper;
