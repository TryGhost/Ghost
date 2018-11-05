const utils = require('../../../');
const url = require('./url');
const date = require('./date');

const mapPost = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);

    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        date.forPost(jsonModel);
    }

    if (frame.options && frame.options.withRelated) {
        frame.options.withRelated.forEach((relation) => {
            // @NOTE: this block also decorates primary_tag/primary_author objects as they
            // are being passed by reference in tags/authors. Might be refactored into more explicit call
            // in the future, but is good enough for current use-case
            if (relation === 'tags' && jsonModel.tags) {
                jsonModel.tags = jsonModel.tags.map(tag => url.forTag(tag.id, tag));

                if (utils.isContentAPI(frame)) {
                    jsonModel.tags = jsonModel.tags.map(tag => date.forTag(tag));
                }
            }

            if (relation === 'author' && jsonModel.author) {
                jsonModel.author = url.forUser(jsonModel.author.id, jsonModel.author, frame.options);
            }

            if (relation === 'authors' && jsonModel.authors) {
                jsonModel.authors = jsonModel.authors.map(author => url.forUser(author.id, author, frame.options));
            }
        });
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
