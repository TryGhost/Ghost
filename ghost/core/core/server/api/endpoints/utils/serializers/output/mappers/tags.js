const clean = require('../utils/clean');
const url = require('../utils/url');

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    url.forTag(model.id, jsonModel, frame.options);
    clean.tag(jsonModel, frame);

    // Columns force-loaded for the URL computation, not requested by the caller.
    if (frame.forcedUrlColumns) {
        frame.forcedUrlColumns.forEach((column) => {
            delete jsonModel[column];
        });
    }

    return jsonModel;
};
