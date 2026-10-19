const clean = require('../utils/clean');
const url = require('../utils/url');

module.exports = (model, frame) => {
  const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

  url.forUser(model.id, jsonModel, frame.options);

  // Force-loaded for the URL computation, not requested by the caller (the
  // author permalink substitutes :slug, so `?fields=url` pulls it in).
  if (frame.forcedUrlColumns && frame.forcedUrlColumns.routerType === 'authors') {
    frame.forcedUrlColumns.columns.forEach((column) => {
      delete jsonModel[column];
    });
  }

  clean.author(jsonModel, frame);

  return jsonModel;
};
