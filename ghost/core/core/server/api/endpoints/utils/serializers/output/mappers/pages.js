const mapPost = require('./posts');

module.exports = async (model, frame, options) => {
    const jsonModel = await mapPost(model, frame, options);

    delete jsonModel.email_subject;
    delete jsonModel.email_segment;
    delete jsonModel.email_only;
    delete jsonModel.newsletter_id;

    // TODO: remove this once full API support is in place
    delete jsonModel.hide_title_and_feature_image;

    return jsonModel;
};
