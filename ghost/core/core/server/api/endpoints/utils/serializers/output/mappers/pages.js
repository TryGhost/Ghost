const mapPost = require('./posts');

module.exports = async (model, frame, options) => {
    const jsonModel = await mapPost(model, frame, options);

    delete jsonModel.email_subject;
    delete jsonModel.email_segment;
    delete jsonModel.email_only;
    delete jsonModel.newsletter_id;

    return jsonModel;
};
