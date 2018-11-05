const utils = require('../../../');
const url = require('./url');
const date = require('./date');

const mapPost = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        date.forPost(jsonModel);
    }

    return jsonModel;
};

const mapTag = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forTag(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        date.forTag(jsonModel);
    }

    return jsonModel;
};

module.exports.mapPost = mapPost;
module.exports.mapTag = mapTag;
