const clean = require('../utils/clean');
const url = require('../utils/url');
const extraAttrs = require('../utils/extra-attrs');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    url.forUser(model.id, jsonModel, frame.options);

    clean.author(jsonModel, frame);

    extraAttrs.forAuthor(frame.options, model, jsonModel);

    return jsonModel;
};
