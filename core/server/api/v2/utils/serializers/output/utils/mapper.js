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

            if (relation === 'author' && jsonModel.author) {
                jsonModel.author = mapUser(jsonModel.author, frame);
            }

            if (relation === 'authors' && jsonModel.authors) {
                jsonModel.authors = jsonModel.authors.map(author => mapUser(author, frame));
            }
        });
    }

    /**
     * Remove extra data attributes passed for filtering when used with columns/fields as bookshelf doesn't filter it out
     */
    if (frame.options.columns && frame.options.columns.indexOf('page') < 0) {
        delete jsonModel.page;
    }

    return jsonModel;
};

const mapSettings = (attrs) => {
    url.forSetting(attrs);
    return attrs;
};

module.exports.mapPost = mapPost;
module.exports.mapUser = mapUser;
module.exports.mapTag = mapTag;
module.exports.mapSettings = mapSettings;
