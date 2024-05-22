const _ = require('lodash');

const batchFields = [
    'id',
    'provider_id',
    'status',
    'member_segment',
    'created_at',
    'updated_at',
    'error_status_code',
    'error_message',
    'error_data'
];

const countFields = [
    'recipients'
];

const batchMapper = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const response = _.pick(jsonModel, batchFields);

    if (jsonModel.count) {
        response.count = _.pick(jsonModel.count, countFields);
    }

    return response;
};

module.exports = batchMapper;
