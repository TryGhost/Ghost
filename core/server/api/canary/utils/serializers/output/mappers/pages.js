const mapPost = require('./posts');

module.exports = async (model, frame, options) => {
    const jsonModel = await mapPost(model, frame, options);

    delete jsonModel.email_subject;
    delete jsonModel.email_recipient_filter;
    delete jsonModel.email_only;

    return jsonModel;
};
