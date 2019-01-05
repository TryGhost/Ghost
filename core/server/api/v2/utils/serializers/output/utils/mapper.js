const utils = require('../../../index');
const url = require('./url');
const date = require('./date');
const members = require('./members');
const clean = require('./clean');
const extraAttrs = require('./extra-attrs');

const mapUser = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    url.forUser(model.id, jsonModel);

    if (utils.isContentAPI(frame)) {
        clean.author(jsonModel);
    }

    return jsonModel;
};

const mapTag = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    url.forTag(model.id, jsonModel);

    if (utils.isContentAPI(frame)) {
        clean.tag(jsonModel);
    }

    return jsonModel;
};

const mapPost = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);

    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        date.forPost(jsonModel);
        members.forPost(jsonModel, frame);
        extraAttrs.forPost(frame, model, jsonModel);
        clean.post(jsonModel);
    }

    if (frame.options && frame.options.withRelated) {
        frame.options.withRelated.forEach((relation) => {
            // @NOTE: this block also decorates primary_tag/primary_author objects as they
            // are being passed by reference in tags/authors. Might be refactored into more explicit call
            // in the future, but is good enough for current use-case
            if (relation === 'tags' && jsonModel.tags) {
                jsonModel.tags = jsonModel.tags.map(tag => mapTag(tag, frame));
            }

            // @TODO: remove
            if (relation === 'author' && jsonModel.author) {
                jsonModel.author = mapUser(jsonModel.author, frame);
            }

            if (relation === 'authors' && jsonModel.authors) {
                jsonModel.authors = jsonModel.authors.map(author => mapUser(author, frame));
            }
        });
    }

    return jsonModel;
};

module.exports.mapPost = mapPost;
module.exports.mapUser = mapUser;
module.exports.mapTag = mapTag;
