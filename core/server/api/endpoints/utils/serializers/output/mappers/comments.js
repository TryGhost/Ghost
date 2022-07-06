const _ = require('lodash');

const commentFields = [
    'id',
    'status',
    'html',
    'created_at',
    'edited_at'
];

const memberFields = [
    'id',
    'name',
    'bio',
    'avatar_image'
];

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const response = _.pick(jsonModel, commentFields);

    if (jsonModel.member) {
        response.member = _.pick(jsonModel.member, memberFields);
    } else {
        response.member = null;
    }

    return response;
};
