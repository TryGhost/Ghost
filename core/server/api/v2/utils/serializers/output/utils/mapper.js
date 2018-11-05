const utils = require('../../../');
const url = require('./url');
const date = require('./date');

const mapPost = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        ['created_at', 'updated_at', 'published_at'].forEach((field) => {
            if (jsonModel[field]) {
                jsonModel[field] = date.format(jsonModel[field]);
            }
        });
    }

    return jsonModel;
};

const mapPage = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        ['created_at', 'updated_at', 'published_at'].forEach((field) => {
            if (jsonModel[field]) {
                jsonModel[field] = date.format(jsonModel[field]);
            }
        });
    }

    return jsonModel;
};

const mapTag = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forTag(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        ['created_at', 'updated_at'].forEach((field) => {
            if (jsonModel[field]) {
                jsonModel[field] = date.format(jsonModel[field]);
            }
        });
    }

    return jsonModel;
};

module.exports.mapPost = mapPost;
module.exports.mapPage = mapPage;
module.exports.mapTag = mapTag;
